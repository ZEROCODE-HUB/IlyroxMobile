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
  // Ref para la suscripción de Realtime (DESHABILITADO)
  const profileSubscriptionRef = useRef<any>(null);
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    /**
     * Inicializar autenticación
     */
    const initAuth = async () => {
      // Timeout de emergencia
      const emergencyTimeoutId = setTimeout(() => {
        if (mounted) {
          console.warn(
            "⏰ Auth init emergency timeout (15s), forcing loading false",
          );
          onLoadingChange(false);
        }
      }, 15000);

      try {
        // Obtener sesión con timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Session timeout")), 8000);
        });

        const result = await Promise.race([sessionPromise, timeoutPromise]);
        const {
          data: { session },
          error,
        } = result;

        clearTimeout(emergencyTimeoutId);

        if (error) {
          console.error("❌ Error getting session:", error);
          if (
            error.message?.includes("expired") ||
            error.message?.includes("invalid")
          ) {
            onSessionChange(null);
            onUserChange(null);
            onProfileChange(null);
          }
        }

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
        } else {
          if (Platform.OS !== "web") {
            OneSignal.User.removeAlias("external_id");
            OneSignal.logout();
          }
        }

        // Cargar perfil si hay usuario
        if (session?.user) {
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
              // ✅ REALTIME DESHABILITADO - No se crea suscripción
              currentUserIdRef.current = session.user.id;
            }
          } catch (profileErr) {
            console.error("❌ Error loading profile:", profileErr);
            if (mounted) {
              onProfileChange(null);
            }
          }
        } else {
          onProfileChange(null);
        }
      } catch (err: any) {
        console.error("❌ Unexpected error during auth init:", err);
        if (
          err.message?.includes("timeout") ||
          err.message?.includes("Network")
        ) {
          onSessionChange(null);
          onUserChange(null);
          onProfileChange(null);
        }
      } finally {
        if (mounted) {
          onLoadingChange(false);
        }
      }
    };
    /*
    const setupProfileSubscription = async (userId: string) => {
      // Si ya existe una suscripción para este usuario, no crear otra
      if (profileSubscriptionRef.current && currentUserIdRef.current === userId) {
        console.log("✅ Profile subscription already exists for", userId.substring(0, 8));
        return;
      }

      // Limpiar suscripción anterior si existe
      await cleanupProfileSubscription();

      console.log("📡 Setting up profile subscription for", userId.substring(0, 8));

      profileSubscriptionRef.current = supabase
        .channel(`profile-updates-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "perfiles",
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            console.log("🔄 Profile updated via Realtime");
            const updatedProfile = payload.new as perfiles;
            onProfileChange(updatedProfile);
          }
        )
        .subscribe((status) => {
          console.log("📡 Subscription status:", status);
        });

      currentUserIdRef.current = userId;
    };
    */
    /*
    const cleanupProfileSubscription = async () => {
      if (profileSubscriptionRef.current) {
        console.log("🧹 Cleaning up profile subscription");
        try {
          await supabase.removeChannel(profileSubscriptionRef.current);
        } catch (err) {
          console.warn("⚠️ Error removing channel:", err);
        }
        profileSubscriptionRef.current = null;
        currentUserIdRef.current = null;
      }
    };
    */

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
          console.error("❌ Error loading profile:", profileErr);
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
