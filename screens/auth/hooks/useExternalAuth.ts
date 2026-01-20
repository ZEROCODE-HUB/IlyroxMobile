/**
 * useExternalAuth.ts
 * Hook para manejar autenticación externa (Google, Facebook, Apple)
 */

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { supabase } from "../../../lib/supabase";
import { perfiles } from "../../../types";
import { useApp } from "../../../context/AppContext";
import { useImageUpload } from "../../../hooks/useImageUpload";
import { useGoogleAuth } from "../../../lib/useGoogleAuth";
import { OneSignal } from "react-native-onesignal";

export type AuthProvider = "google" | "facebook" | "apple";

export interface PendingExternalUser {
  id: string;
  email: string;
  avatarUrl?: string | null;
  fullName?: string | null;
}

export interface ExternalAuthFormData {
  name: string;
  lastNamePaterno: string;
  lastNameMaterno: string;
  phone: string;
  estado: string;
  avatarUri: string | null;
  ocupacion: string;
  modalidad: string;
  nombreInmobiliaria: string;
  anosExperiencia: string;
}

export function useExternalAuth() {
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<PendingExternalUser | null>(null);

  const { setCurrentUser } = useApp();
  const { uploadImage } = useImageUpload();
  const { signInWithGoogle, loading: googleLoading } = useGoogleAuth();

  // Manejar autenticación con proveedor externo
  const handleProviderAuth = useCallback(
    async (
      provider: AuthProvider,
      onNeedProfileCompletion: (user: PendingExternalUser, extractedData: Partial<ExternalAuthFormData>) => void,
      onSuccess: () => void
    ): Promise<void> => {
      setLoading(true);
      try {
        let authResult: { user: any; error: any } | null = null;
        let externalError: string | null = null;

        switch (provider) {
          case "google":
            const res = await signInWithGoogle();
            if (res?.error) {
              externalError = res.error;
            } else if (res?.user) {
              authResult = { user: res.user, error: null };
            }
            break;
          case "facebook":
            Alert.alert("Próximamente", "Inicio con Facebook en desarrollo");
            setLoading(false);
            return;
          case "apple":
            Alert.alert("Próximamente", "Inicio con Apple en desarrollo");
            setLoading(false);
            return;
        }

        if (externalError) {
          if (externalError !== "Inicio de sesión cancelado o fallido") {
            Alert.alert("Error de Autenticación", externalError);
          }
          setLoading(false);
          return;
        }

        if (!authResult?.user) {
          setLoading(false);
          return;
        }

        const user = authResult.user;

        // Verificar si el perfil existe
        const { data: profile } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          // Usuario existente - login exitoso
          OneSignal.login(user.id);
          setCurrentUser(profile);
          onSuccess();
        } else {
          // Usuario nuevo - necesita completar perfil
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "";
          const spaceIndex = fullName.indexOf(" ");

          let extractedName = "";
          let extractedLastName = "";

          if (spaceIndex > 0) {
            extractedName = fullName.substring(0, spaceIndex);
            extractedLastName = fullName.substring(spaceIndex + 1);
          } else {
            extractedName = fullName;
          }

          const pendingUserData: PendingExternalUser = {
            id: user.id,
            email: user.email!,
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            fullName,
          };

          setPendingUser(pendingUserData);

          onNeedProfileCompletion(pendingUserData, {
            name: extractedName,
            lastNamePaterno: extractedLastName,
          });
        }
      } catch (error: any) {
        Alert.alert("Error de Autenticación", error.message);
      } finally {
        setLoading(false);
      }
    },
    [signInWithGoogle, setCurrentUser]
  );

  // Finalizar registro externo
  const finalizeExternalRegistration = useCallback(
    async (
      formData: ExternalAuthFormData,
      onSuccess: () => void
    ): Promise<boolean> => {
      if (!pendingUser) return false;

      setLoading(true);
      try {
        // Subir avatar si hay uno nuevo
        let finalAvatarUrl = pendingUser.avatarUrl || "";
        if (formData.avatarUri) {
          const url = await uploadImage(formData.avatarUri, "fotos", "fotoperfil");
          if (url) finalAvatarUrl = url;
        }

        const newProfile: perfiles = {
          id: pendingUser.id,
          email: pendingUser.email,
          nombre: formData.name || pendingUser.fullName || "Usuario",
          apellido_paterno: formData.lastNamePaterno,
          apellido_materno: formData.lastNameMaterno,
          celular: formData.phone || "",
          prefijo_celular: null,
          rol: "cliente",
          pais: "Mexico",
          estado: formData.estado,
          foto: finalAvatarUrl,
          estado_registro: "pendiente",
          aprobaciones_recibidas: 0,
          aprobaciones_requeridas: 3,
          anos_experiencia: formData.anosExperiencia,
          ocupacion: formData.ocupacion,
          otro_ocupacion: null,
          modalidad: formData.modalidad || null,
          nombre_inmobiliaria: formData.nombreInmobiliaria || null,
          curso_certificacion: null,
          nombre_completo: `${formData.name} ${formData.lastNamePaterno} ${formData.lastNameMaterno}`.trim(),
          activado_en: null,
          deleted_at: null,
          biografia: null,
          sitio_web: null,
          calificacion_promedio: null,
          total_calificaciones: null,
          total_recomendaciones_positivas: null,
          total_recomendaciones_negativas: null,
        };

        const { data, error } = await supabase
          .from("perfiles")
          .upsert(newProfile)
          .select()
          .single();

        if (error) throw error;

        OneSignal.login(pendingUser.id);
        setCurrentUser(data);
        setPendingUser(null);
        onSuccess();
        return true;
      } catch (error: any) {
        Alert.alert("Error al crear perfil", error.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [pendingUser, uploadImage, setCurrentUser]
  );

  // Cancelar registro externo
  const cancelExternalRegistration = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      OneSignal.User.removeAlias("external_id");
      await OneSignal.logout();
    } catch (error) {
      console.error("Error al cancelar registro:", error);
    } finally {
      setPendingUser(null);
    }
  }, []);

  return {
    loading: loading || googleLoading,
    pendingUser,
    handleProviderAuth,
    finalizeExternalRegistration,
    cancelExternalRegistration,
    setPendingUser,
  };
}
