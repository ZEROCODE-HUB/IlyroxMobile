/**
 * useProfileLoader.ts
 * Hook para cargar perfiles con cache y reintentos inteligentes
 */

import { useRef } from "react";
import { supabase } from "../../lib/supabase";
import { perfiles } from "../../types";

export const useProfileLoader = () => {
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
            errorMsg.includes("PGRST") ||
            errorMsg.includes("JWT") ||
            errorMsg.includes("permission")
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
   * Limpiar cache
   */
  const clearCache = (userId?: string) => {
    if (userId) {
      delete profileCacheRef.current[userId];
      delete loadingProfileRef.current[userId];
    } else {
      profileCacheRef.current = {};
      loadingProfileRef.current = {};
    }
  };

  /**
   * Actualizar cache directamente
   */
  const updateCache = (userId: string, profile: perfiles) => {
    profileCacheRef.current[userId] = profile;
  };

  return {
    loadProfile,
    clearCache,
    updateCache,
  };
};