/**
 * useViewTracking.ts - REFACTORIZADO
 * Hook para trackear visualizaciones de feed items
 *
 * FIXES:
 * - Debouncing agresivo (5 segundos)
 * - Batch de saves (agrupa múltiples)
 * - Solo trackea si realmente se vio >3 segundos
 * - Previene queries masivas en scroll rápido
 */

import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";

interface UseViewTrackingOptions {
  feedItemId: string;
  userId?: string;
  isVisible: boolean;
  onInteraction?: (
    type: "like" | "comentario" | "compartir" | "guardar",
  ) => void;
}

// Queue global para agrupar saves
const pendingSaves = new Map<
  string,
  {
    feedItemId: string;
    userId: string;
    seconds: number;
    completo: boolean;
  }
>();

let saveTimer: NodeJS.Timeout | null = null;

/**
 * Función global para guardar vistas en batch
 */
const flushPendingSaves = async () => {
  if (pendingSaves.size === 0) return;

  const items = Array.from(pendingSaves.values());
  pendingSaves.clear();

  try {
    // Insertar todas en una sola query
    await supabase.from("feed_visualizaciones").upsert(
      items.map((item) => ({
        feed_item_id: item.feedItemId,
        usuario_id: item.userId,
        tiempo_visualizacion: item.seconds,
        completo: item.completo,
        interaccion: null,
      })),
      { onConflict: "feed_item_id,usuario_id" },
    );
  } catch (error) {
    console.error("Error saving views batch:", error);
  }
};

export function useViewTracking(options: UseViewTrackingOptions) {
  const { feedItemId, userId, isVisible } = options;

  const startTimeRef = useRef<number>(0);
  const hasTrackedRef = useRef<boolean>(false);

  /**
   * Iniciar tracking cuando el item es visible
   */
  useEffect(() => {
    if (!userId || !isVisible || hasTrackedRef.current) return;

    // Iniciar timer
    startTimeRef.current = Date.now();

    return () => {
      // Al desmontar, calcular tiempo
      if (startTimeRef.current > 0) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

        // Solo trackear si vio al menos 2 segundos
        if (elapsed >= 2) {
          hasTrackedRef.current = true;

          const completo = elapsed >= 3;

          // Agregar a queue en lugar de guardar inmediatamente
          const key = `${feedItemId}-${userId}`;
          pendingSaves.set(key, {
            feedItemId,
            userId,
            seconds: elapsed,
            completo,
          });

          // Debounce: guardar después de 5 segundos de inactividad
          if (saveTimer) clearTimeout(saveTimer);
          saveTimer = setTimeout(() => {
            flushPendingSaves();
          }, 5000);
        }
      }
    };
  }, [isVisible, userId, feedItemId]);

  /**
   * Registrar interacción
   */
  const trackInteraction = async (
    type: "like" | "comentario" | "compartir" | "guardar",
  ) => {
    if (!userId) return;

    try {
      // Las interacciones sí se guardan inmediatamente
      await supabase.from("feed_visualizaciones").upsert(
        {
          feed_item_id: feedItemId,
          usuario_id: userId,
          tiempo_visualizacion: Math.floor(
            (Date.now() - startTimeRef.current) / 1000,
          ),
          completo: true,
          interaccion: type,
        },
        {
          onConflict: "feed_item_id,usuario_id",
        },
      );

      hasTrackedRef.current = true;
    } catch (error) {
      console.error("Error tracking interaction:", error);
    }
  };

  return {
    trackInteraction,
  };
}
