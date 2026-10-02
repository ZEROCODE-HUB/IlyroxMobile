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
import { ProfileNotFoundError } from "./useProfileLoader";

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

      log.info("handleAuthChange: Evento recibido", { event: _event, hasSession: !!session, userId: session?.user?.id });

      // Verificar expiración (síncrono, seguro dentro del callback)
      if (session?.expires_at) {
        const expiresAt = session.expires_at * 1000;
        if (Date.now() >= expiresAt) {
          log.warn("handleAuthChange: Sesion expirada", { expiresAt: session.expires_at });
          onSessionChange(null);
          onUserChange(null);
          onProfileChange(null);
          finishLoading();
          // Limpiar también la sesión PERSISTIDA. Sin esto, auth-js sigue
          // reutilizando el token caducado y la app queda en un bucle en el
          // splash (vuelve a emitir eventos con la misma sesión expirada).
          // Se difiere con setTimeout(0) para NO ejecutar Supabase dentro del
          // lock de auth (provocaría un deadlock). `scope: "local"` limpia sin
          // llamada al servidor (la sesión ya no es válida de todos modos).
          setTimeout(() => {
            supabase.auth
              .signOut({ scope: "local" })
              .catch((e) => log.warn("signOut tras sesión expirada falló:", e));
          }, 0);
          return;
        }
      }

      // Actualización de estado síncrona (no toca la DB, no usa el lock)
      onSessionChange(session);
      onUserChange(session?.user ?? null);

      if (!session?.user) {
        log.info("handleAuthChange: No hay usuario, limpiando estado");
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

      log.info("handleAuthChange: Usuario autenticado, procesando perfil", { userId: session.user.id, email: session.user.email });
      // Diferir el trabajo async FUERA del lock de auth para evitar el deadlock.
      const userId = session.user.id;
      setTimeout(async () => {
        if (!mounted) return;

        if (Platform.OS !== "web") {
          // Solo asociar el external_id al dispositivo - NO reactiva push automáticamente
          // El usuario debe togglear manualmente en Settings para activar/desactivar
          OneSignal.login(userId);
        }

        try {
          log.info("handleAuthChange: Llamando loadProfile", { userId, event: _event });

          const profileData = await loadProfile(userId);
          log.info("handleAuthChange: loadProfile result", { userId, found: !!profileData, event: _event });

          // `loadProfile` solo devuelve null cuando la red falló (la sesión sigue
          // siendo válida): en ese caso NO se cierra sesión, la app queda
          // esperando a que vuelva la conexión.
          if (!profileData) {
            log.warn(
              "handleAuthChange: No se pudo cargar el perfil (fallo de red); se conserva la sesión",
              { userId },
            );
            return;
          }

          log.info("handleAuthChange: Perfil cargado exitosamente", { userId, perfilId: profileData.id });
          if (mounted) onProfileChange(profileData);
        } catch (profileErr) {
          if (profileErr instanceof ProfileNotFoundError) {
            // El perfil no existe (usuario eliminado/bloqueado desde el panel).
            // ÚNICO caso en el que se cierra la sesión automáticamente.
            log.error("handleAuthChange: Perfil inexistente, cerrando sesión", { userId });
            await supabase.auth.signOut();
            if (mounted) onProfileChange(null);
          } else {
            log.error("handleAuthChange: Error en loadProfile", { userId, error: profileErr });
          }
        } finally {
          log.info("handleAuthChange: Finalizando carga", { userId });
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