/**
 * AuthContext.tsx - REFACTORIZADO
 * Contexto principal de autenticación simplificado
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { supabase } from "../lib/supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { perfiles } from "../types";
import { useProfileLoader } from "./auth/useProfileLoader";
import { useAuthListener } from "./auth/useAuthListener";
import { OneSignal } from "react-native-onesignal";
import { Platform } from "react-native";
import { router } from "expo-router";
import { logger } from "../utils/logger";

const log = logger.scoped("AuthContext");

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  profile: perfiles | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (newData?: perfiles) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<perfiles | null>(null);
  const [loading, setLoading] = useState(true);

  // Hook personalizado para cargar perfiles con cache
  const { loadProfile, clearCache, updateCache } = useProfileLoader();

  /**
   * Refrescar perfil manualmente o actualizarlo con datos conocidos
   *
   * Memoizado: PendingApprovalScreen lo usa como dependencia de un efecto que
   * monta un intervalo de sondeo. Una referencia nueva por render reiniciaría
   * el efecto en bucle.
   */
  const refreshProfile = useCallback(
    async (newData?: perfiles) => {
      if (!user) return;

      if (newData) {
        // Actualizar localmente sin llamar a la red
        setProfile(newData);
        updateCache(user.id, newData);
      } else {
        // Forzar carga desde la red
        clearCache(user.id);
        const profileData = await loadProfile(user.id);
        // Un fallo de red devuelve null: conservar el perfil actual. Ponerlo a
        // null dejaría la app en la pantalla de carga (hay sesión, no hay
        // perfil) hasta reiniciarla.
        if (profileData) setProfile(profileData);
      }
    },
    [user, loadProfile, clearCache, updateCache],
  );

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      if (Platform.OS !== "web") {
        // logout() basta: removeAlias("external_id") destruye la identidad del
        // usuario en OneSignal y su external_id se queda sin dispositivos.
        await OneSignal.logout();
      }
    } catch (error) {
      log.error("signOut error:", error);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      clearCache();

      // Forzar navegación al login como medida extra
      router.replace("/login");
    }
  };

  // El refresco de sesión lo gestiona auth-js automáticamente vía
  // `autoRefreshToken: true` (ver lib/supabase.ts). NO añadir un refresco
  // manual en paralelo: con la rotación de refresh tokens activa en el
  // proyecto, dos refrescadores concurrentes reutilizan un token ya rotado,
  // Supabase lo interpreta como robo y revoca toda la sesión
  // ("Invalid Refresh Token: Refresh Token Not Found").

  // Hook para manejar cambios de autenticación
  useAuthListener({
    onSessionChange: setSession,
    onUserChange: setUser,
    onProfileChange: setProfile,
    onLoadingChange: setLoading,
    loadProfile,
  });

  const value: AuthContextType = {
    session,
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
