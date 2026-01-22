import { useCallback } from "react";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Alert } from "react-native";

interface OtherUser {
  id: string;
  nombre: string;
  apellido_paterno?: string;
  foto?: string | null;
}

export function useChatInitiator() {
  const router = useRouter();
  const { user } = useAuth(); // Current user

  /**
   * Busca si existe una conversación con estos parámetros
   */
  const findExistingConversation = useCallback(
    async (otherUserId: string, propertyId: string | null) => {
      if (!user?.id) return null;

      try {
        let query = supabase
          .from("conversaciones")
          .select("id")
          .or(
            `and(usuario1_id.eq.${user.id},usuario2_id.eq.${otherUserId}),and(usuario1_id.eq.${otherUserId},usuario2_id.eq.${user.id})`,
          );

        if (propertyId) {
          query = query.eq("propiedad_id", propertyId);
        } else {
          query = query.is("propiedad_id", null);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error("Error finding conversation:", error);
          return null;
        }

        return data?.id || null;
      } catch (e) {
        console.error("Exception finding conversation:", e);
        return null;
      }
    },
    [user?.id],
  );

  /**
   * Inicia el proceso de chat:
   * 1. Verifica si ya existe conversación.
   * 2. Si existe -> Navega a ella.
   * 3. Si no existe -> Navega a vista 'new' con params para crearla al enviar mensaje.
   */
  const handleContact = useCallback(
    async (
      otherUserId: string,
      propertyId: string | null,
      otherUserData: OtherUser,
      isAppointment: boolean = false,
    ) => {
      if (!user?.id) {
        Alert.alert("Error", "Debes iniciar sesión para contactar");
        return;
      }

      // No contactarse a sí mismo
      if (user.id === otherUserId) {
        Alert.alert("Aviso", "No puedes iniciar un chat contigo mismo");
        return;
      }

      try {
        // Verificar existencia
        const existingId = await findExistingConversation(
          otherUserId,
          propertyId,
        );

        // Standardize params to avoid objects that can't be stringified in the URL easily
        // Expo router params work best as simple key-value pairs
        const params: any = {
          initialUser: JSON.stringify(otherUserData),
          initialPropertyId: propertyId || "",
          isAppointment: isAppointment ? "true" : "false",
        };

        if (existingId) {
          params.conversationId = existingId;
        } else {
          params.conversationId = "new";
        }

        router.push({
          pathname: "/(stack)/messages",
          params: params,
        });
      } catch (error) {
        console.error("Nav error or check error:", error);
        // Fallback genérico
        Alert.alert("Error", "No se pudo iniciar el chat");
      }
    },
    [user?.id, router, findExistingConversation],
  );

  return {
    handleContact,
    findExistingConversation,
  };
}
