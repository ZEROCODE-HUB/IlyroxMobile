/**
 * useNotificationHistory.ts
 *
 * Hook que pagina el historial completo de notificaciones del usuario
 * usando la RPC `get_notifications_paged` (keyset por created_at DESC, id
 * DESC). Devuelve un shape listo para agrupar por día en la UI.
 */

import { useCallback, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { NotificacionExtendida } from "@/context/NotificationContext";
import { logger } from "@/utils/logger";

const log = logger.scoped("useNotificationHistory");

interface NotificationsPage {
  items: NotificacionExtendida[];
  nextCursor: { created_at: string; id: string } | null;
}

interface UseNotificationHistoryOptions {
  userId: string | undefined;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 30;

function mapRow(row: any): NotificacionExtendida {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo || "",
    mensaje: row.mensaje,
    feed_item_id: row.feed_item_id,
    data: row.data || {},
    estado: (row.estado || "leida") as "pendiente" | "leida",
    leida_en: row.leida_en,
    created_at: row.created_at,
    autores: row.autores || [],
    total_autores: row.total_autores || 0,
    contenido: row.thumbnail
      ? {
          id: row.contenido_id,
          thumbnail: row.thumbnail,
          tipo: row.tipo_contenido,
        }
      : null,
  };
}

export function useNotificationHistory({
  userId,
  pageSize = DEFAULT_PAGE_SIZE,
}: UseNotificationHistoryOptions) {
  const query = useInfiniteQuery<NotificationsPage, Error>({
    queryKey: ["notifications-history", userId, pageSize],
    enabled: Boolean(userId),
    staleTime: 30_000,
    initialPageParam: undefined as { created_at: string; id: string } | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    queryFn: async ({ pageParam }) => {
      if (!userId) return { items: [], nextCursor: null };

      const args: Record<string, any> = {
        p_user_id: userId,
        p_limit: pageSize,
      };
      const cursor = pageParam as { created_at: string; id: string } | undefined;
      if (cursor) {
        args.p_cursor_created_at = cursor.created_at;
        args.p_cursor_id = cursor.id;
      }

      const { data, error } = await supabase.rpc(
        "get_notifications_paged",
        args,
      );

      if (error) {
        log.error("get_notifications_paged error:", error);
        throw error;
      }

      const rows = (data as any[]) || [];
      // La RPC devuelve p_limit+1 filas si hay siguiente página.
      const hasMore = rows.length > pageSize;
      const visible = hasMore ? rows.slice(0, pageSize) : rows;
      const items = visible.map(mapRow);

      let nextCursor: { created_at: string; id: string } | null = null;
      if (hasMore) {
        const last = visible[visible.length - 1];
        nextCursor = {
          created_at: last.created_at,
          id: last.id,
        };
      }

      return { items, nextCursor };
    },
  });

  // Aplanar todas las páginas en un único array, con dedup por id
  // (defensivo: si el realtime inserta una fila que ya estaba cargada).
  const notifications = useMemo<NotificacionExtendida[]>(() => {
    if (!query.data) return [];
    const seen = new Set<string>();
    const out: NotificacionExtendida[] = [];
    for (const page of query.data.pages) {
      for (const n of page.items) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
        out.push(n);
      }
    }
    return out;
  }, [query.data]);

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const refresh = useCallback(() => {
    return query.refetch();
  }, [query.refetch]);

  return {
    notifications,
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    refreshing: query.isRefetching && !query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    loadMore,
    refresh,
    error: query.error ? (query.error as Error).message : null,
  };
}

/**
 * Helpers para agrupar notificaciones por día (Hoy / Ayer / fecha).
 * Devuelve un array de secciones listo para SectionList.
 */
export interface NotificationSection {
  title: string;
  data: NotificacionExtendida[];
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDayLabel(date: Date, today: Date): string {
  const dayStart = startOfDay(date).getTime();
  const todayStart = startOfDay(today).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((todayStart - dayStart) / oneDayMs);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  // Formato localizado es-MX: "12 de febrero"
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
  }).format(date);
}

export function groupNotificationsByDay(
  notifications: NotificacionExtendida[],
  now: Date = new Date(),
): NotificationSection[] {
  if (notifications.length === 0) return [];

  const sections: NotificationSection[] = [];
  let currentKey: string | null = null;
  let currentSection: NotificationSection | null = null;

  for (const n of notifications) {
    const created = new Date(n.created_at);
    const dayLabel = formatDayLabel(created, now);

    if (dayLabel !== currentKey) {
      currentSection = { title: dayLabel, data: [n] };
      sections.push(currentSection);
      currentKey = dayLabel;
    } else if (currentSection) {
      currentSection.data.push(n);
    }
  }

  return sections;
}
