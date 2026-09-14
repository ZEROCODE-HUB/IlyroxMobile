import { useCallback } from "react";
import { useRouter } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import { queryClient } from "@/lib/queryClient";
import { GroupedConversation } from "@/services/conversationsService";

interface OtherUser {
  id: string;
  nombre: string;
  apellido_paterno?: string;
  foto?: string | null;
}

export function useChatInitiator() {
  const router = useRouter();
  const { user } = useAuth(); // Current user
  const { showModal } = useModal();

  /**
   * Resuelve en CERO red si ya existe una conversación, consultando la caché
   * de React Query (["conversations", userId]) que mantiene useConversations.
   *
   * La caché agrupada no expone `propiedad_id`, así que solo podemos resolver
   * con certeza el chat GENERAL (sin propiedad). Para chats de una propiedad,
   * se navega como "new" y MessagingScreen resuelve el id real en background:
   * el historial se carga solo sin bloquear la navegación.
   */
  const resolveCachedConversation = useCallback(
    (otherUserId: string, propertyId: string | null): string | null => {
      if (!user?.id || propertyId) return null;

      const groups = queryClient.getQueryData<GroupedConversation[]>(
        ["conversations", user.id],
      );
      if (!groups?.length) return null;

      const group = groups.find((g) => g.other_user?.id === otherUserId);
      if (!group) return null;

      // conversacion_mas_reciente_id es el id REAL; el `id` de la agrupación
      // puede ser un fallback "usuario1_id_usuario2_id" sin conversación real.
      return group.conversacion_mas_reciente_id || null;
    },
    [user?.id],
  );

  /**
   * Inicia el proceso de chat ABIENDO LA NAVEGACIÓN AL INSTANTE:
   * 1. Resuelve la conversación existente SÍNCRONICAMENTE desde la caché
   *    (sin red) cuando es posible.
   * 2. Si existe -> Navega a ella.
   * 3. Si no existe -> Navega a 'new' al instante; el chat real se resuelve en
   *    background en MessagingScreen y se evita duplicar conversación en
   *    `useMessages.getOrCreateConversation`.
   */
  const handleContact = useCallback(
    (
      otherUserId: string,
      propertyId: string | null,
      otherUserData: OtherUser,
      isAppointment: boolean = false,
    ) => {
      if (!user?.id) {
        showModal({ title: "Error", message: "Debes iniciar sesión para contactar", confirmText: "OK" });
        return;
      }

      // No contactarse a sí mismo
      if (user.id === otherUserId) {
        showModal({ title: "Aviso", message: "No puedes iniciar un chat contigo mismo", confirmText: "OK" });
        return;
      }

      // La existencia se resuelve desde caché (sincrónico, sin red). Si no hay
      // certeza, "new" + resolución en background en MessagingScreen.
      const existingId = resolveCachedConversation(otherUserId, propertyId);

      // Standardize params to avoid objects that can't be stringified in the URL easily
      // Expo router params work best as simple key-value pairs
      const params: any = {
        initialUser: JSON.stringify(otherUserData),
        initialPropertyId: propertyId || "",
        isAppointment: isAppointment ? "true" : "false",
        conversationId: existingId || "new",
      };

      router.push({
        pathname: "/(stack)/messages",
        params,
      });
    },
    [user?.id, router, resolveCachedConversation],
  );

  return { handleContact };
}
