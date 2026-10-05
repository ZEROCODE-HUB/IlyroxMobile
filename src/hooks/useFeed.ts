/**
 * useFeed.ts
 * Hook principal para cargar el feed con algoritmo de engagement.
 *
 * Usa React Query (useInfiniteQuery) para paginación infinita + cache.
 * La lógica de fetch vive en feedService; este archivo orquesta cache,
 * auto-refresh y enriquecimiento post-carga (stats + recomendaciones).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { FeedItem, RecommendedByPreviewUser, User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { feedService, type FeedPage } from "@/services/feedService";
import { profileService } from "@/services/profileService";
import { PAGINATION } from "@/constants/config";
import { logger } from "@/utils/logger";

const log = logger.scoped("useFeed");

const STATS_REFRESH_THROTTLE_MS = 60_000;
const AUTO_REFRESH_INTERVAL_MS = 2 * 60_000;

interface UseFeedOptions {
  userId?: string;
  pageSize?: number;
  enableAutoRefresh?: boolean;
}

const feedKeys = {
  all: ["feed"] as const,
  list: (pageSize: number, userId?: string) =>
    [...feedKeys.all, "list", pageSize, userId ?? "anon"] as const,
  item: (id: string, userId?: string) =>
    [...feedKeys.all, "item", id, userId ?? "anon"] as const,
};

/**
 * Id del CONTENIDO (post/reel/propiedad) que representa un item del feed.
 * El `id` del item es el id de la fila de `feed_items`, que puede cambiar si el
 * trigger re-crea la fila (p. ej. al cambiar el status de una propiedad), por eso
 * para identificar contenido usamos siempre el id del post/propiedad.
 */
function contentIdOf(item: FeedItem): string {
  return item.postDetails?.id || item.propertyDetails?.id || item.id;
}

function dedupeItems(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  const out: FeedItem[] = [];
  for (const item of items) {
    const key = `${item.type}_${contentIdOf(item)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function useFeed(options: UseFeedOptions = {}) {
  const {
    userId,
    pageSize = PAGINATION.FEED_PAGE_SIZE,
    enableAutoRefresh = true,
  } = options;

  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: feedKeys.list(pageSize, userId),
    queryFn: ({ pageParam = 0 }) =>
      feedService.getFeedPage(pageParam as number, pageSize, userId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 30_000,
    refetchInterval: enableAutoRefresh ? AUTO_REFRESH_INTERVAL_MS : false,
  });

  // Enriquecimiento post-carga: previews de recomendaciones
  const [recommendedByPreviewByUserId, setRecommendedByPreviewByUserId] =
    useState<Record<string, RecommendedByPreviewUser[] | undefined>>({});

  const baseItems = useMemo(() => {
    const pages = query.data?.pages || [];
    return dedupeItems(pages.flatMap((p) => p.items));
  }, [query.data]);

  const items = useMemo<FeedItem[]>(() => {
    if (Object.keys(recommendedByPreviewByUserId).length === 0) return baseItems;
    return baseItems.map((it) => {
      const preview = recommendedByPreviewByUserId[it.user.id];
      if (!preview) return it;
      return {
        ...it,
        user: { ...it.user, recommendedByPreview: preview },
      };
    });
  }, [baseItems, recommendedByPreviewByUserId]);

  // Cargar previews para IDs nuevos que aparezcan en la lista
  useEffect(() => {
    if (baseItems.length === 0) return;
    const ids = Array.from(
      new Set(
        baseItems
          .map((it) => it.user?.id)
          .filter(Boolean) as string[],
      ),
    );
    const pendingIds = ids.filter(
      (id) => recommendedByPreviewByUserId[id] === undefined,
    );
    if (pendingIds.length === 0) return;

    let cancelled = false;
    profileService
      .getRecommendationPreviewsForUsers(pendingIds, userId)
      .then((map) => {
        if (cancelled) return;
        setRecommendedByPreviewByUserId((prev) => {
          const next = { ...prev };
          Object.entries(map).forEach(([id, previews]) => {
            next[id] = previews as RecommendedByPreviewUser[];
          });
          return next;
        });
      })
      .catch((err) => log.error("getRecommendationPreviews failed", err));

    return () => {
      cancelled = true;
    };
  }, [baseItems, recommendedByPreviewByUserId]);

  // Actualización manual de stats (throttle 60s) — usado por useFocusEffect externo
  const lastStatsUpdateRef = useRef<number>(0);
  const refreshUserStats = useMemo(() => {
    return async () => {
      const now = Date.now();
      if (now - lastStatsUpdateRef.current < STATS_REFRESH_THROTTLE_MS) return;
      lastStatsUpdateRef.current = now;

      const ids = Array.from(
        new Set(
          baseItems
            .map((it) => it.user?.id)
            .filter(Boolean) as string[],
        ),
      );
      if (ids.length === 0) return;

      const [statsRows, previewsMap] = await Promise.all([
        feedService.getReviewStats(ids),
        profileService.getRecommendationPreviewsForUsers(ids, userId),
      ]);

      const statsById = new Map(statsRows.map((s) => [s.profesional_id, s]));

      // Mutar la cache directamente con las stats frescas
      queryClient.setQueryData(
        feedKeys.list(pageSize, userId),
        (prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            pages: prev.pages.map((page: any) => ({
              ...page,
              items: page.items.map((it: FeedItem) => {
                const stats = statsById.get(it.user.id);
                if (!stats) return it;
                const nextUser: User = {
                  ...it.user,
                  rating:
                    typeof stats.calificacion_promedio === "number"
                      ? stats.calificacion_promedio
                      : 0,
                  totalRatings:
                    typeof stats.total_resenas === "number"
                      ? stats.total_resenas
                      : 0,
                  positiveRecommendations:
                    typeof stats.total_recomiendan === "number"
                      ? stats.total_recomiendan
                      : 0,
                  negativeRecommendations:
                    typeof stats.total_no_recomiendan === "number"
                      ? stats.total_no_recomiendan
                      : 0,
                };
                return { ...it, user: nextUser };
              }),
            })),
          };
        },
      );

      // Actualizar previews
      setRecommendedByPreviewByUserId((prev) => {
        const next = { ...prev };
        Object.entries(previewsMap).forEach(([id, previews]) => {
          next[id] = previews as RecommendedByPreviewUser[];
        });
        return next;
      });
    };
  }, [baseItems, pageSize, queryClient, userId]);

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage]);

  const refresh = useCallback(() => {
    return query.refetch();
  }, [query.refetch]);

  // Refresca UN item del feed (post/propiedad) sin tocar el orden de la lista.
  const patchFeedItemById = useCallback(
    (contenidoId: string) => patchFeedItem(queryClient, contenidoId, userId),
    [queryClient, userId],
  );

  // Quita UN item de la lista del feed (borrado / dejó de ser visible).
  const removeFeedItemById = useCallback(
    (feedItemId: string) => removeFeedItem(queryClient, feedItemId),
    [queryClient],
  );

  return {
    items,
    loading: query.isLoading,
    refreshing: query.isRefetching && !query.isFetchingNextPage,
    hasMore: Boolean(query.hasNextPage),
    error: query.error ? (query.error as Error).message : null,
    loadMore,
    refresh,
    refreshUserStats,
    patchFeedItem: patchFeedItemById,
    removeFeedItem: removeFeedItemById,
  };
}

/**
 * Refresca UN SOLO item del feed (post/reel/propiedad) sin recargar la lista.
 *
 * Por qué: `queryClient.invalidateQueries({ queryKey: ["feed"] })` marca la
 * lista infinita como stale y dispara un refetch en background; el servidor
 * devuelve el feed reordenado por `engagement_score`, así que los items se
 * saltan de posición mientras el usuario los está mirando (el "feed se
 * desordena al editar"). Aquí en su lugar se trae solo ese contenido con
 * `feedService.getFeedItem` y se sustituye en el MISMO índice de la MISMA
 * página, por lo que el orden no cambia.
 *
 * Si el contenido ya no debe estar en el feed (propiedad Vendida/Reservada/
 * Eliminada, post borrado, autor bloqueado), `getFeedItem` devuelve `null` y el
 * item se quita de la lista en vez de dejar datos viejos.
 *
 * `contenidoId` acepta el id del contenido (post/propiedad) o el id de la fila
 * de feed_items.
 */
export async function patchFeedItem(
  queryClient: QueryClient,
  contenidoId: string,
  currentUserId?: string,
) {
  try {
    const fresh = await feedService.getFeedItem(contenidoId, currentUserId);

    // La query del item individual (detalle, comentarios) se actualiza con el
    // dato fresco: son pocas queries y no afectan al orden de la lista. Se
    // cubren las dos claves posibles (id de feed_items e id del contenido).
    if (fresh) {
      queryClient.setQueryData(feedKeys.item(fresh.id, currentUserId), fresh);
      if (contenidoId !== fresh.id) {
        queryClient.setQueryData(
          feedKeys.item(contenidoId, currentUserId),
          fresh,
        );
      }
    } else {
      queryClient.removeQueries({ queryKey: feedKeys.item(contenidoId) });
    }

    // Todas las variantes de la lista (cualquier pageSize / usuario) se parchean.
    // Si el item no está entre las páginas cargadas NO se inserta (insertarlo
    // cambiaría el orden); aparecerá en el siguiente refetch o paginación.
    queryClient.setQueriesData<InfiniteData<FeedPage, unknown>>(
      { queryKey: [...feedKeys.all, "list"] },
      (prev) => {
        if (!prev?.pages?.length) return prev;

        let changed = false;

        const pages = prev.pages.map((page) => {
          const items = page.items ?? [];
          const nextItems: FeedItem[] = [];
          let pageChanged = false;

          for (const item of items) {
            const matches =
              item.id === contenidoId || contentIdOf(item) === contenidoId;
            if (matches) {
              pageChanged = true;
              // Si `fresh` es null el contenido ya no va en el feed: se omite.
              if (fresh) nextItems.push(fresh);
              continue;
            }
            nextItems.push(item);
          }

          if (!pageChanged) return page;
          changed = true;
          return { ...page, items: nextItems };
        });

        return changed ? { ...prev, pages } : prev;
      },
    );

    return fresh;
  } catch (e) {
    log.warn("patchFeedItem failed", e);
    return null;
  }
}

/** Quita un item del feed de la cache de listas (borrado / dejó de ser visible). */
export function removeFeedItem(
  queryClient: QueryClient,
  feedItemId: string,
) {
  queryClient.setQueriesData<InfiniteData<FeedPage, unknown>>(
    { queryKey: [...feedKeys.all, "list"] },
    (prev) => {
      if (!prev?.pages?.length) return prev;
      let changed = false;
      const pages = prev.pages.map((page) => {
        const items = (page.items ?? []).filter(
          (item) =>
            item.id !== feedItemId && contentIdOf(item) !== feedItemId,
        );
        if (items.length === (page.items?.length ?? 0)) return page;
        changed = true;
        return { ...page, items };
      });
      return changed ? { ...prev, pages } : prev;
    },
  );
  queryClient.removeQueries({ queryKey: feedKeys.item(feedItemId) });
}

/**
 * Inserta una publicación recién creada al inicio del feed (prepend optimista),
 * para que aparezca SIEMPRE en la posición 0 justo tras publicar, ignorando el
 * engagement_score. El orden por score se reaplica en el siguiente refetch
 * (pull-to-refresh, cambio de pestaña, auto-refresh o reentrar).
 *
 * `contenidoId` es el id del post/reel/propiedad: getFeedItem acepta tanto el id
 * del feed_item como el contenido_id.
 */
export async function prependPublishedFeedItem(
  queryClient: QueryClient,
  contenidoId: string,
  userId?: string,
) {
  try {
    const item = await feedService.getFeedItem(contenidoId, userId);
    if (!item) return;
    queryClient.setQueriesData(
      { queryKey: [...feedKeys.all, "list"] },
      (prev: any) => {
        if (!prev?.pages?.length) return prev;
        const exists = prev.pages.some((pg: any) =>
          pg.items?.some((it: FeedItem) => it.id === item.id),
        );
        if (exists) return prev;
        const [first, ...rest] = prev.pages;
        return {
          ...prev,
          pages: [
            { ...first, items: [item, ...(first.items ?? [])] },
            ...rest,
          ],
        };
      },
    );
  } catch (e) {
    log.warn("prependPublishedFeedItem failed", e);
  }
}

// Re-exports para consumidores existentes
export { formatTimestamp } from "@/services/feedService";

export function useFeedItem(feedItemId: string) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const query = useQuery({
    queryKey: feedKeys.item(feedItemId, currentUserId),
    queryFn: () => feedService.getFeedItem(feedItemId, currentUserId),
    enabled: Boolean(feedItemId),
    // Cache más largo para que clicks repetidos al mismo post sean
    // instantáneos (no hay fetch si el cache está fresco). SESSION_REFRESH
    // sigue controlando el refetch en background cuando el usuario vuelve.
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 15 * 60 * 1000, // 15 min
  });

  return {
    item: query.data ?? null,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}