/**
 * useViewTracking.ts - REFACTORIZADO
 * Hook para trackear visualizaciones de feed items
 *
 * FIXES:
 * - Debouncing agresivo (5 segundos)
 * - Batch de saves (agrupa múltiples)
 * - Solo trackea si realmente se vio >3 segundos
 * - Previene queries masivas en scroll rápido
 * - Dedup en cliente: la tabla feed_visualizaciones no tiene UNIQUE en
 *   (feed_item_id, usuario_id), por lo que upsert con onConflict fallaría
 *   silenciosamente. Hacemos SELECT + UPDATE/INSERT por separado.
 */

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { logger } from "@/utils/logger";const log = logger.scoped("useViewTracking");

interface UseViewTrackingOptions {
  feedItemId: string;
  userId?: string;
  isVisible: boolean;
  onInteraction?: (
    type: "like" | "comentario" | "compartir" | "guardar",
  ) => void;
}

interface PendingView {
  feedItemId: string;
  userId: string;
  seconds: number;
  completo: boolean;
}

// Queue global para agrupar saves (Map para dedup por (feed_item_id, userId))
const pendingSaves = new Map<string, PendingView>();

let saveTimer: NodeJS.Timeout | null = null;

/**
 * Función global para guardar vistas en batch.
 *
 * La tabla feed_visualizaciones no tiene UNIQUE en (feed_item_id, usuario_id),
 * por lo que upsert con onConflict falla. Hacemos dedup en cliente:
 * 1. SELECT para ver cuáles filas ya existen.
 * 2. UPDATE para las existentes.
 * 3. INSERT para las nuevas.
 */
const flushPendingSaves = async () => {
  if (pendingSaves.size === 0) return;

  const items = Array.from(pendingSaves.values());
  pendingSaves.clear();

  try {
    const feedItemIds = Array.from(new Set(items.map((i) => i.feedItemId)));
    const userIds = Array.from(new Set(items.map((i) => i.userId)));

    const { data: existing, error: selectError } = await supabase
      .from("feed_visualizaciones")
      .select("id, feed_item_id, usuario_id")
      .in("feed_item_id", feedItemIds)
      .in("usuario_id", userIds);

    if (selectError) {
      log.error("Error fetching existing views:", selectError);
      return;
    }

    const toInsert: Array<{
      feed_item_id: string;
      usuario_id: string;
      tiempo_visualizacion: number;
      completo: boolean;
      interaccion: string | null;
    }> = [];
    const toUpdate: Array<{
      id: string;
      tiempo_visualizacion: number;
      completo: boolean;
    }> = [];

    const existingMap = new Map(
      (existing || []).map((e: {
        id: string;
        feed_item_id: string;
        usuario_id: string;
      }) => [`${e.feed_item_id}::${e.usuario_id}`, e.id]),
    );

    for (const item of items) {
      const key = `${item.feedItemId}::${item.userId}`;
      const existingId = existingMap.get(key);
      if (existingId) {
        toUpdate.push({
          id: existingId,
          tiempo_visualizacion: item.seconds,
          completo: item.completo,
        });
      } else {
        toInsert.push({
          feed_item_id: item.feedItemId,
          usuario_id: item.userId,
          tiempo_visualizacion: item.seconds,
          completo: item.completo,
          interaccion: null,
        });
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("feed_visualizaciones")
        .insert(toInsert);
      if (insertError) {
        if (insertError.code === '23503') {
          log.warn("Views batch skipped: feed_item_id no longer exists (item may have been deleted)");
        } else {
          log.error("Error inserting views batch:", insertError);
        }
      }
    }

    // Las UPDATEs se hacen individualmente porque Supabase no soporta
    // batch UPDATE con distintos valores. En la práctica, una vista
    // se trackea una vez por sesión, así que toUpdate es 0 o 1 elemento.
    for (const upd of toUpdate) {
      const { error: updateError } = await supabase
        .from("feed_visualizaciones")
        .update({
          tiempo_visualizacion: upd.tiempo_visualizacion,
          completo: upd.completo,
        })
        .eq("id", upd.id);
      if (updateError) {
        log.error("Error updating view:", updateError);
      }
    }
  } catch (error) {
    log.error("Error saving views batch:", error);
  }
};

/**
 * Trackea una interacción (like, comentario, etc.) de forma inmediata.
 * Misma estrategia dedup que flushPendingSaves.
 */
const trackInteractionDedup = async (
  feedItemId: string,
  userId: string,
  seconds: number,
  type: "like" | "comentario" | "compartir" | "guardar",
): Promise<void> => {
  try {
    const { data: existing, error: selectError } = await supabase
      .from("feed_visualizaciones")
      .select("id")
      .eq("feed_item_id", feedItemId)
      .eq("usuario_id", userId)
      .maybeSingle();

    if (selectError) {
      log.error("Error fetching existing interaction:", selectError);
      return;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("feed_visualizaciones")
        .update({
          tiempo_visualizacion: seconds,
          completo: true,
          interaccion: type,
        })
        .eq("id", existing.id);
      if (updateError) {
        log.error("Error updating interaction:", updateError);
      }
    } else {
      const { error: insertError } = await supabase
        .from("feed_visualizaciones")
        .insert({
          feed_item_id: feedItemId,
          usuario_id: userId,
          tiempo_visualizacion: seconds,
          completo: true,
          interaccion: type,
        });
      if (insertError) {
        if (insertError.code === '23503') {
          log.warn("Interaction skipped: feed_item_id no longer exists (item may have been deleted)");
        } else {
          log.error("Error inserting interaction:", insertError);
        }
      }
    }
  } catch (error) {
    log.error("Error tracking interaction:", error);
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
    if (!userId || !feedItemId || !isVisible || hasTrackedRef.current) return;

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

    const seconds = Math.floor(
      (Date.now() - startTimeRef.current) / 1000,
    );

    hasTrackedRef.current = true;

    await trackInteractionDedup(feedItemId, userId, seconds, type);

    options.onInteraction?.(type);
  };

  return {
    trackInteraction,
  };
}
