/**
 * AuthContext.tsx - REFACTORIZADO
 * Contexto principal de autenticación simplificado
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { perfiles } from "../types";
import { useProfileLoader } from "./auth/useProfileLoader";
import { useAuthListener } from "./auth/useAuthListener";
import { useSessionRefresh } from "./auth/useSessionRefresh";
import { OneSignal } from "react-native-onesignal";

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  profile: perfiles | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const { loadProfile, clearCache } = useProfileLoader();

  /**
   * Refrescar perfil manualmente
   */
  const refreshProfile = async () => {
    if (user) {
      clearCache(user.id);
      const profileData = await loadProfile(user.id);
      setProfile(profileData);
    }
  };

  /**
   * Cerrar sesión
   * //  DELETE /apps/{app_id}/users/by/{alias_label}/{alias_id}/identity/external_id
   * // alias_label = el tipo de alias para identificar al usuario (ej: onesignal_id)
   * // alias_id = el identificador del usuario
   * // El último parámetro es external_id (el alias a eliminar)
   */
  const signOut = async () => {
    try {
      console.log("Cerrar sesión presionado");
      await supabase.auth.signOut();
      OneSignal.User.removeAlias("external_id");
      await OneSignal.logout();
    } catch (error) {
      console.error("❌ Supabase signOut error:", error);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      clearCache();
    }
  };

  // Hook para refrescar sesión cada 50 minutos
  useSessionRefresh(session);

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
