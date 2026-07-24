/**
 * useUnseenMatchesCount.ts
 * Contador global de matches sin ver para el badge de Matches en el header.
 *
 * Espejo de usePendingAppointmentsCount: React Query para caché/dedupe +
 * Realtime sobre la tabla `matches` para refrescar al vuelo + refetchInterval
 * como red de seguridad, y sincroniza el total con useMatchesStore.
 *
 * "Sin ver" = match activo, no descartado y con `visto_en` null. Se marcan como
 * vistos (visto_en = now) al abrir la pantalla de Matches (ver Matches.tsx), que
 * es lo que limpia el badge.
 */

import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useMatchesStore } from "@/store/matchesStore";
import { logger } from "@/utils/logger";

const log = logger.scoped("useUnseenMatchesCount");

export const matchesCountKeys = {
  all: ["unseen-matches-count"] as const,
  list: (userId: string) => [...matchesCountKeys.all, userId] as const,
};

async function fetchUnseenCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", userId)
    .eq("activo", true)
    .neq("estado", "descartado")
    .is("visto_en", null);
  if (error) throw error;
  return count ?? 0;
}

export function useUnseenMatchesCount(userId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userId
      ? matchesCountKeys.list(userId)
      : [...matchesCountKeys.all, "anonymous"],
    queryFn: () => fetchUnseenCount(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
    // Red de seguridad si el canal Realtime no está disponible.
    refetchInterval: 60_000,
  });

  // Sincroniza el store global que lee el badge del header.
  const count = query.data ?? 0;
  useEffect(() => {
    useMatchesStore.getState().setUnseenCount(count);
  }, [count]);

  // Realtime (best-effort): si `matches` está en la publicación supabase_realtime
  // el badge se actualiza al vuelo; si no, el refetchInterval lo mantiene.
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleInvalidation = useCallback(() => {
    if (!userId) return;
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: matchesCountKeys.list(userId) });
    }, 400);
  }, [queryClient, userId]);

  useEffect(() => {
    if (!userId) return;
    const channel: RealtimeChannel = supabase
      .channel(`matches-count-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `usuario_id=eq.${userId}` },
        scheduleInvalidation,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          log.warn("Realtime de matches no disponible; se usa refetchInterval");
        }
      });

    return () => {
      if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [userId, scheduleInvalidation]);

  // Refrescar al volver la app a primer plano.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (status === "active" && userId) {
        queryClient.invalidateQueries({ queryKey: matchesCountKeys.list(userId) });
      }
    });
    return () => sub.remove();
  }, [queryClient, userId]);

  return count;
}
