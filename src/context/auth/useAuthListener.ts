/**
 * useAuthListener.ts
 * Hook para escuchar cambios de autenticación y configurar suscripciones Realtime
 *
 * FIX CRÍTICO: Limpieza correcta de suscripciones para evitar loops
 * OPTIMIZACIÓN: Realtime de perfil deshabilitado para reducir requests
 */

import { useEffect } from "react";
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
  useEffect(() => {
    let mounted = true;

    // Timeout de emergencia — fallback por si INITIAL_SESSION nunca llega o la
    // carga del perfil se cuelga; garantiza que `loading` no quede atascado.
    const emergencyTimeoutId = setTimeout(() => {
      if (mounted) {
        log.warn("Auth init emergency timeout (20s), forcing loading false");
        onLoadingChange(false);
      }
    }, 20000);

    // Finaliza la carga inicial y desactiva el timeout de emergencia.
    const finishLoading = () => {
      clearTimeout(emergencyTimeoutId);
      if (mounted) onLoadingChange(false);
    };

    /**
     * Manejar cambios de autenticación.
     *
     * auth-js emite automáticamente INITIAL_SESSION al registrar este listener
     * (recuperando la sesión persistida en AsyncStorage), por lo que NO hace
     * falta un initAuth() con getSession() aparte: este único punto cubre tanto
     * la carga inicial como todos los cambios posteriores (SIGNED_IN,
     * TOKEN_REFRESHED, SIGNED_OUT...), sin duplicar la carga del perfil.
     *
     * ⚠️ CRÍTICO: Este callback se ejecuta DENTRO del lock de auth de gotrue
     * (auth-js emite los eventos sosteniendo `_acquireLock`). Hacer `await` de
     * cualquier operación de Supabase aquí —p. ej. loadProfile, que ejecuta
     * `supabase.from(...).select()`— provoca un DEADLOCK: la query intenta tomar
     * el mismo lock que ya posee el emisor del evento, y este espera a que
     * termine el callback. El deadlock duraba hasta que el antiguo timeout de 8s
     * lo cortaba con "Profile load timeout".
     *
     * Solución (recomendada por Supabase): la parte síncrona actualiza el estado
     * de inmediato; el trabajo async se difiere con setTimeout(0) para que el
     * callback retorne y libere el lock ANTES de tocar la base de datos.
     */
    const handleAuthChange = (_event: string, session: Session | null) => {
      if (!mounted) return;

      // Verificar expiración (síncrono, seguro dentro del callback)
      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000;
        if (Date.now() >= expiresAt) {
          onSessionChange(null);
          onUserChange(null);
          onProfileChange(null);
          finishLoading();
          return;
        }
      }

      // Actualización de estado síncrona (no toca la DB, no usa el lock)
      onSessionChange(session);
      onUserChange(session?.user ?? null);

      if (!session?.user) {
        // Sin sesión, limpiar todo
        onProfileChange(null);
        if (Platform.OS !== "web") {
          // Solo logout(): desasocia el external_id de este dispositivo y crea
          // un usuario anónimo. NO usar removeAlias("external_id") — borra la
          // identidad del usuario en OneSignal, dejando su external_id sin
          // suscripciones push (la API responde entonces "All included players
          // are not subscribed") o directamente sin usuario.
          OneSignal.logout();
        }
        finishLoading();
        return;
      }

      // Diferir el trabajo async FUERA del lock de auth para evitar el deadlock.
      const userId = session.user.id;
      setTimeout(async () => {
        if (!mounted) return;

        if (Platform.OS !== "web") {
          OneSignal.login(userId);
          // login() SOLO asocia el external_id a este dispositivo; NO reactiva la
          // suscripción push. Si quedó en opt-out (un logout previo la apagó, o el
          // dispositivo estaba "muerto": token vacío / enabled:false), las push
          // dejan de llegar aunque el usuario vuelva a entrar. optIn() la vuelve a
          // encender. Es idempotente y NO pide permiso (eso es requestPermission),
          // así que no puede robar el foco ni pisar una preferencia del usuario:
          // si el permiso del SO sigue concedido, revive la suscripción; si el
          // usuario denegó en Ajustes, es un no-op (no hay token que activar).
          OneSignal.User.pushSubscription.optIn();
        }

        try {
          // loadProfile ya tiene reintentos con backoff y cache propios;
          // sin el lock contenido, responde en ms y el backoff solo actúa
          // ante fallos de red reales.
          const profileData = await loadProfile(userId);
          // Solo se propaga un perfil válido. Poner `profile` a null con la
          // sesión viva hace que RootLayoutNav sustituya el <Stack> por
          // <InitialLoading>, desmontando la pantalla actual: un TOKEN_REFRESHED
          // con mala red borraba el formulario que el usuario estaba llenando.
          if (mounted && profileData) onProfileChange(profileData);

          // ✅ REALTIME DESHABILITADO
          // if (["SIGNED_IN", "INITIAL_SESSION"].includes(_event)) {
          //   await setupProfileSubscription(userId);
          // }
        } catch (profileErr) {
          log.error("Error loading profile:", profileErr);
        } finally {
          finishLoading();
        }
      }, 0);
    };

    // Registrar el listener — dispara INITIAL_SESSION con la sesión persistida.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Cleanup
    return () => {
      mounted = false;
      clearTimeout(emergencyTimeoutId);
      subscription.unsubscribe();
      // cleanupProfileSubscription(); // DESHABILITADO
    };
  }, []); // Array VACÍO - solo ejecutar una vez
};
