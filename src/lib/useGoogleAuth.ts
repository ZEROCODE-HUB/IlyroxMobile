// WEB 542422641306-1tis8d54ud3uddthpoml07f7e3g9cttr.apps.googleusercontent.com
// iOS: 542422641306-2nst8bt4aul54kveivu2qpg5i4gobn0b.apps.googleusercontent.com
// Android: 542422641306-vei8vojeg42jns70tdmnvpo10s54h7co.apps.googleusercontent.com

import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase";
import { useState } from "react";

import { useModal } from "@/context/ModalContext";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CONFIG = {
  webClientId:
    "542422641306-1tis8d54ud3uddthpoml07f7e3g9cttr.apps.googleusercontent.com",
  androidClientId:
    "542422641306-vei8vojeg42jns70tdmnvpo10s54h7co.apps.googleusercontent.com",
  iosClientId:
    "542422641306-2nst8bt4aul54kveivu2qpg5i4gobn0b.apps.googleusercontent.com",
};

import { logger } from "@/utils/logger";const log = logger.scoped("useGoogleAuth");

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false);
  const { showModal } = useModal();

  const [request, , promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CONFIG.webClientId,
  });

  const signInWithGoogle = async () => {
    try {
      if (!request) {
        throw new Error("Google Auth no inicializado. Intenta nuevamente.");
      }

      setLoading(true);
      const result = await promptAsync();

      if (result?.type !== "success") {
        setLoading(false);
        return { error: "Inicio de sesión cancelado o fallido" };
      }

      const { authentication } = result;

      if (!authentication?.idToken) {
        throw new Error("No se obtuvo el token de Google");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: authentication.idToken,
      });

      if (error) throw error;

      return { user: data.user, error: null };
    } catch (error: any) {
      log.error("Error en Google Auth:", error);
      showModal({ title: "Error", message: error.message, confirmText: "OK" });
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    signInWithGoogle,
    request,
  };
}
