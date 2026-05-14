/**
 * useAuthListener.ts
 * Hook para escuchar cambios de autenticación y configurar suscripciones Realtime
 *
 * FIX CRÍTICO: Limpieza correcta de suscripciones para evitar loops
 * OPTIMIZACIÓN: Realtime de perfil deshabilitado para reducir requests
 */

import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { perfiles } from "../../types";
import { OneSignal } from "react-native-onesignal";
import { Platform } from "react-native";
import { logger } from "@/utils/logger";

const log = logger.scoped("auth-listener");

interface UseAuthListenerProps {
  onSessionChange: (session: Session | null) => void;
  onUserChange: (user: SupabaseUser | null) => void;
  onProfileChange: (profile: perfiles | null) => void;
  onLoadingChange: (loading: boolean) => void;
  loadProfile: (userId: string) => Promise<perfiles | null>;
}

export const useAuthListener = ({
  onSessionChange,
  onUserChange,
  onProfileChange,
  onLoadingChange,
  loadProfile,
}: UseAuthListenerProps) => {
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    /**
     * Inicializar autenticación
     */
    const initAuth = async () => {
      // Timeout de emergencia — solo fallback si todo lo demás falla
      const emergencyTimeoutId = setTimeout(() => {
        if (mounted) {
          log.warn("Auth init emergency timeout (20s), forcing loading false");
          onLoadingChange(false);
        }
      }, 20000);

      try {
        // Obtener sesión — sin timeout agresivo, onAuthStateChange maneja el resto
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          log.error("Error getting session:", error);
          // Solo limpiar en errores reales (token inválido), no en timeouts de red
          if (error.message?.includes("invalid") || error.message?.includes("expired")) {
            onSessionChange(null);
            onUserChange(null);
            onProfileChange(null);
          }
          return;
        }

        // Verificar expiración
        if (session?.expires_at) {
          const expiresAt = session.expires_at * 1000;
          if (Date.now() >= expiresAt) {
            onSessionChange(null);
            onUserChange(null);
            onProfileChange(null);
            return;
          }
        }

        onSessionChange(session);
        onUserChange(session?.user ?? null);

        if (session?.user) {
          if (Platform.OS !== "web") OneSignal.login(session.user.id);

          try {
            const profileData = await loadProfile(session.user.id);
            if (mounted) {
              onProfileChange(profileData);
              currentUserIdRef.current = session.user.id;
            }
          } catch (profileErr) {
            log.error("Error loading profile:", profileErr);
            if (mounted) onProfileChange(null);
          }
        } else {
          onProfileChange(null);
          if (Platform.OS !== "web") {
            OneSignal.User.removeAlias("external_id");
            OneSignal.logout();
          }
        }
      } catch (err: any) {
        log.error("Unexpected error during auth init:", err);
      } finally {
        clearTimeout(emergencyTimeoutId);
        if (mounted) onLoadingChange(false);
      }
    };
    /**
     * Manejar cambios de autenticación
     * FIX: Realtime deshabilitado
     */
    const handleAuthChange = async (event: string, session: Session | null) => {
      if (!mounted) return;

      // Verificar expiración
      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        if (now >= expiresAt) {
          onSessionChange(null);
          onUserChange(null);
          onProfileChange(null);
          onLoadingChange(false);
          return;
        }
      }

      onSessionChange(session);
      onUserChange(session?.user ?? null);

      if (session?.user) {
        if (Platform.OS !== "web") OneSignal.login(session.user.id);
        try {
          const profilePromise = loadProfile(session.user.id);
          const profileTimeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Profile load timeout")), 8000);
          });

          const profileData = (await Promise.race([
            profilePromise,
            profileTimeoutPromise,
          ])) as perfiles | null;

          if (mounted) {
            onProfileChange(profileData);

            // ✅ REALTIME DESHABILITADO
            // const shouldSetupSubscription = [
            //   "SIGNED_IN",
            //   "INITIAL_SESSION",
            // ].includes(event);
            // if (shouldSetupSubscription) {
            //   await setupProfileSubscription(session.user.id);
            // }
          }
        } catch (profileErr) {
          log.error("Error loading profile:", profileErr);
          if (mounted) {
            onProfileChange(null);
          }
        }
      } else {
        // Sin sesión, limpiar todo
        if (mounted) {
          onProfileChange(null);
          if (Platform.OS !== "web") {
            OneSignal.User.removeAlias("external_id");
            OneSignal.logout();
          }
          // await cleanupProfileSubscription(); // DESHABILITADO
        }
      }

      if (mounted) {
        onLoadingChange(false);
      }
    };

    // Iniciar autenticación
    initAuth();

    // Escuchar cambios
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
      // cleanupProfileSubscription(); // DESHABILITADO
    };
  }, []); // Array VACÍO - solo ejecutar una vez
};
