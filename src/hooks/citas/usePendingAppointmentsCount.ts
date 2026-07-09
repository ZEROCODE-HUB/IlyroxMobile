/**
 * usePendingAppointmentsCount.ts
 * Contador global de citas próximas pendientes para el badge del header.
 *
 * Espejo de useConversations (mensajes): React Query para caché/dedupe +
 * Realtime sobre la tabla `citas` para refrescar al vuelo + refetchInterval
 * como red de seguridad, y sincroniza el total con useCitasStore.
 *
 * "Próxima pendiente" = misma condición que el tab "upcoming" de
 * useAppointments: el usuario es agente o cliente, estado 'pendiente',
 * fecha >= hoy y sin borrar. No hay concepto de cita "vista", así que el
 * número refleja cuántas próximas tienes; no se limpia al abrir la pantalla.
 */

import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useCitasStore } from "@/store/citasStore";
import { logger } from "@/utils/logger";

const log = logger.scoped("usePendingAppointmentsCount");

const citasCountKeys = {
  all: ["pending-appointments-count"] as const,
  list: (userId: string) => [...citasCountKeys.all, userId] as const,
};

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

async function fetchPendingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("citas")
    .select("id", { count: "exact", head: true })
    .or(`agente_id.eq.${userId},cliente_id.eq.${userId}`)
    .is("deleted_at", null)
    .eq("estado", "pendiente")
    .gte("fecha", todayISO());
  if (error) throw error;
  return count ?? 0;
}

export function usePendingAppointmentsCount(userId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userId
      ? citasCountKeys.list(userId)
      : [...citasCountKeys.all, "anonymous"],
    queryFn: () => fetchPendingCount(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
    // Red de seguridad si el canal Realtime no está disponible.
    refetchInterval: 60_000,
  });

  // Sincroniza el store global que lee el badge del header.
  const count = query.data ?? 0;
  useEffect(() => {
    useCitasStore.getState().setPendingCount(count);
  }, [count]);

  // Realtime (best-effort): si `citas` está en la publicación supabase_realtime
  // el badge se actualiza al vuelo; si no, el refetchInterval lo mantiene.
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleInvalidation = useCallback(() => {
    if (!userId) return;
    if (reloadTimerRef.current) clearTimeout(reloadTimerRef.current);
    reloadTimerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: citasCountKeys.list(userId) });
    }, 400);
  }, [queryClient, userId]);

  useEffect(() => {
    if (!userId) return;
    const channel: RealtimeChannel = supabase
      .channel(`citas-count-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "citas", filter: `agente_id=eq.${userId}` },
        scheduleInvalidation,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "citas", filter: `cliente_id=eq.${userId}` },
        scheduleInvalidation,
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          log.warn("Realtime de citas no disponible; se usa refetchInterval");
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
        queryClient.invalidateQueries({ queryKey: citasCountKeys.list(userId) });
      }
    });
    return () => sub.remove();
  }, [queryClient, userId]);

  return count;
}
