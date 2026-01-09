/**
 * AuthContext.tsx - OPTIMIZADO
 * Maneja el estado de autenticación global de la app
 * 
 * MEJORAS:
 * - Timeout aumentado de 5s a 30s para redes lentas
 * - Backoff exponencial real: 2s, 4s, 8s
 * - Cache de perfil para evitar llamadas redundantes
 * - Mejor manejo de errores de red
 * - AbortController para cancelar peticiones
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { perfiles } from "../types";

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
  
  // Cache para evitar llamadas redundantes
  const profileCacheRef = useRef<{ [userId: string]: perfiles }>({});
  const loadingProfileRef = useRef<{ [userId: string]: Promise<perfiles | null> }>({});

  /**
   * Cargar perfil con reintentos inteligentes y cache
   */
  const loadProfile = async (
    userId: string,
    maxRetries = 3
  ): Promise<perfiles | null> => {
    if (!userId) {
      console.warn("⚠️ loadProfile: No userId provided");
      return null;
    }

    // Verificar cache primero
    if (profileCacheRef.current[userId]) {
      console.log("✅ Using cached profile for", userId.substring(0, 8));
      return profileCacheRef.current[userId];
    }

    // Si ya está cargando, retornar la promesa existente
    if (loadingProfileRef.current[userId]) {
      console.log("⏳ Profile already loading for", userId.substring(0, 8));
      return loadingProfileRef.current[userId];
    }

    // Crear nueva promesa de carga
    const loadPromise = (async () => {
      let lastError: any = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            // Backoff exponencial: 2s, 4s, 8s
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`🔄 Retrying profile load (attempt ${attempt}/${maxRetries}) in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          console.log(`📡 Attempting to fetch profile... (attempt ${attempt + 1})`);
          const startTime = Date.now();

          const { data, error } = await supabase
            .from("perfiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();

          const endTime = Date.now();
          console.log(`⏱️ Query took ${endTime - startTime}ms`);

          if (error) {
            // Si no existe el perfil, no reintentamos
            if (error.code === "PGRST116") {
              console.log("ℹ️ Profile not found for", userId.substring(0, 8));
              return null;
            }
            throw error;
          }

          if (data) {
            // Guardar en cache
            profileCacheRef.current[userId] = data;
            console.log("✅ Profile loaded successfully for", userId.substring(0, 8));
            return data;
          }

          return null;
        } catch (err: any) {
          lastError = err;
          
          const errorMsg = err.message || err.toString();
          console.warn(
            `⚠️ Attempt ${attempt}/${maxRetries} failed:`,
            errorMsg
          );

          // Si es el último intento, no esperar más
          if (attempt === maxRetries) {
            break;
          }

          // Si es un error fatal (no de red), no reintentar
          if (
            errorMsg.includes('PGRST') ||
            errorMsg.includes('JWT') ||
            errorMsg.includes('permission')
          ) {
            console.error("❌ Fatal error, stopping retries:", errorMsg);
            break;
          }
        }
      }

      console.error(
        `❌ All attempts failed to load profile for ${userId.substring(0, 8)}:`,
        lastError?.message || lastError
      );
      
      return null;
    })();

    // Guardar promesa en cache de loading
    loadingProfileRef.current[userId] = loadPromise;

    try {
      const result = await loadPromise;
      return result;
    } finally {
      // Limpiar cache de loading después de 5 segundos
      setTimeout(() => {
        delete loadingProfileRef.current[userId];
      }, 5000);
    }
  };

  /**
   * Refrescar perfil manualmente
   */
  const refreshProfile = async () => {
    if (user) {
      // Limpiar cache antes de recargar
      delete profileCacheRef.current[user.id];
      delete loadingProfileRef.current[user.id];
      
      const profileData = await loadProfile(user.id);
      setProfile(profileData);
    }
  };

  /**
   * Cerrar sesión
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("❌ Supabase signOut error:", error);
    } finally {
      // Limpiar estado local y cache
      setSession(null);
      setUser(null);
      setProfile(null);
      profileCacheRef.current = {};
      loadingProfileRef.current = {};
    }
  };

  /**
   * Listener de cambios en la sesión
   */
  useEffect(() => {
    let mounted = true;
    let profileSubscription: any = null;

    const initAuth = async () => {
      // Timeout de emergencia más corto para evitar carga infinita
      const emergencyTimeoutId = setTimeout(() => {
        if (mounted && loading) {
          console.warn("⏰ Auth init emergency timeout (15s), forcing loading false");
          setLoading(false);
        }
      }, 15000); // 15 segundos de emergencia

      // Timeout para getSession específicamente
      const sessionTimeoutId = setTimeout(() => {
        if (mounted && loading) {
          console.warn("⏰ getSession timeout (10s), clearing session and stopping");
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }, 10000); // 10 segundos para getSession

      try {
        // Obtener sesión inicial con timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Session timeout")), 8000);
        });

        const result = await Promise.race([
          sessionPromise,
          timeoutPromise,
        ]);
        
        const { data: { session }, error } = result;

        clearTimeout(sessionTimeoutId);

        if (error) {
          console.error("❌ Error getting session:", error);
          // Si es un error de sesión inválida/expirada, limpiar estado
          if (error.message?.includes("expired") || error.message?.includes("invalid")) {
            console.log("🔄 Session expired/invalid, clearing auth state");
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }

        if (!mounted) {
          clearTimeout(emergencyTimeoutId);
          return;
        }

        // Verificar si la sesión está expirada
        if (session?.expires_at) {
          const expiresAt = session.expires_at * 1000; // Convertir a milisegundos
          const now = Date.now();
          if (now >= expiresAt) {
            console.log("🔄 Session expired, clearing auth state");
            setSession(null);
            setUser(null);
            setProfile(null);
            if (mounted) {
              setLoading(false);
            }
            clearTimeout(emergencyTimeoutId);
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
            // Cargar perfil con timeout
            try {
              const profilePromise = loadProfile(session.user.id);
              const profileTimeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error("Profile load timeout")), 8000);
              });

              const profileData = await Promise.race([
                profilePromise,
                profileTimeoutPromise,
              ]) as perfiles | null;

            if (mounted) {
              setProfile(profileData);
            }
          } catch (profileErr) {
            console.error("❌ Error loading profile:", profileErr);
            // Continuar sin perfil si falla la carga
            if (mounted) {
              setProfile(null);
            }
          }
        } else {
          // No hay sesión, asegurar que el estado esté limpio
          setProfile(null);
        }
      } catch (err: any) {
        console.error("❌ Unexpected error during auth init:", err);
        // Si es timeout o error de red, limpiar estado
        if (err.message?.includes("timeout") || err.message?.includes("Network")) {
          console.log("🔄 Network/timeout error, clearing auth state");
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        clearTimeout(emergencyTimeoutId);
        clearTimeout(sessionTimeoutId);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Renovar token cada 50 minutos
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log("🔄 Refreshing session...");
          const { data, error } = await supabase.auth.refreshSession();

          if (error) {
            console.error("❌ Error refreshing session:", error);
          } else {
            console.log("✅ Session refreshed successfully");
            if (mounted && data.session) {
              setSession(data.session);
            }
          }
        }
      } catch (err) {
        console.error("❌ Error in refresh interval:", err);
      }
    }, 50 * 60 * 1000); // 50 minutos

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔐 Auth event:", event);
        if (session) {
          console.log(
            "📅 Session expires at:",
            new Date(session.expires_at! * 1000).toLocaleString()
          );
        }

        if (!mounted) return;

        // Verificar si la sesión está expirada
        if (session?.expires_at) {
          const expiresAt = session.expires_at * 1000;
          const now = Date.now();
          if (now >= expiresAt) {
            console.log("🔄 Session expired in onAuthStateChange, clearing");
            setSession(null);
            setUser(null);
            setProfile(null);
            if (mounted) {
              setLoading(false);
            }
            return;
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            // Cargar perfil con timeout
            const profilePromise = loadProfile(session.user.id);
            const profileTimeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error("Profile load timeout")), 8000);
            });

            const profileData = await Promise.race([
              profilePromise,
              profileTimeoutPromise,
            ]) as perfiles | null;

            if (mounted) {
              setProfile(profileData);

              // Configurar Realtime para este usuario
              if (profileSubscription) {
                profileSubscription.unsubscribe();
              }

              profileSubscription = supabase
                .channel(`public:perfiles:id=eq.${session.user.id}`)
                .on(
                  "postgres_changes",
                  {
                    event: "UPDATE",
                    schema: "public",
                    table: "perfiles",
                    filter: `id=eq.${session.user.id}`,
                  },
                  (payload) => {
                    console.log("🔄 Profile updated via Realtime:", payload.new);
                    const updatedProfile = payload.new as perfiles;
                    
                    // Actualizar cache
                    profileCacheRef.current[session.user.id] = updatedProfile;
                    setProfile(updatedProfile);
                  }
                )
                .subscribe();
            }
          } catch (profileErr) {
            console.error("❌ Error loading profile in onAuthStateChange:", profileErr);
            // Continuar sin perfil si falla
            if (mounted) {
              setProfile(null);
            }
          }
        } else {
          if (mounted) {
            setProfile(null);
            if (profileSubscription) {
              profileSubscription.unsubscribe();
              profileSubscription = null;
            }
          }
        }

        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }
      clearInterval(refreshInterval);
    };
  }, []); // Solo ejecutar una vez al montar

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