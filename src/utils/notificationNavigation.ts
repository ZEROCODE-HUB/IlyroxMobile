/**
 * notificationNavigation.ts
 *
 * Helper único para construir la navegación desde una notificación cuando
 * la notificación referencia un feed_item (post / propiedad / reel) y
 * opcionalmente lleva comment_ids y author_ids en su `data` jsonb.
 *
 * Es la ÚNICA fuente de verdad para esa lógica: la usan
 * - `buildNotificationNavigation` en _layout.tsx (push de OneSignal)
 * - `NotificationHistoryScreen.handleNotificationPress` (tap en la lista)
 *
 * Si el backend cambia la forma del `data` o las rutas de destino,
 * se modifica aquí y todos los consumidores quedan corregidos.
 *
 * Optimizaciones:
 * - El feed_item se resuelve UNA sola vez aquí (no se vuelve a consultar
 *   en post/[id]). Se guarda en el cache de TanStack Query con la misma
 *   queryKey que usa `useFeedItem`, así `useFeedItem` lee del cache
 *   caliente y no hace fetch.
 */

import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { logger } from "./logger";

const log = logger.scoped("notificationNavigation");

interface BuildFeedItemNavigationParams {
  router: { push: (target: any) => any };
  feedItemId: string;
  data?: Record<string, unknown> | null;
  /**
   * QueryClient para prefetch del feed_item en cache. Opcional.
   * Si se pasa, se usa `getFeedItem` y se guarda en cache con la misma
   * queryKey que `useFeedItem`, evitando el fetch duplicado en
   * `post/[id]`. `currentUserId` es necesario para la queryKey.
   */
  queryClient?: QueryClient;
  currentUserId?: string;
}

type NavigationFn = () => void;

const FEED_KEYS = {
  all: ["feed"] as const,
  item: (id: string, userId?: string) =>
    [...FEED_KEYS.all, "item", id, userId ?? "anon"] as const,
};

/**
 * Resuelve la navegación para una notificación que apunta a un feed_item.
 * Devuelve una función lista para invocarse, o null si el feed_item ya no
 * existe o el tipo de contenido es desconocido.
 */
export async function buildFeedItemNavigation(
  params: BuildFeedItemNavigationParams,
): Promise<NavigationFn | null> {
  const { router, feedItemId, data, queryClient, currentUserId } = params;

  if (!feedItemId) return null;

  // 1) Resolver el feed_item. Primero intentamos el select completo
  //    (vía getFeedItem) si hay queryClient, para guardarlo en cache y
  //    evitar el fetch duplicado en post/[id]. Si no hay queryClient
  //    o falla, fallback al select mínimo (solo contenido_id + tipo).
  let contenidoId: string | null = null;
  let tipoContenido: string | null = null;

  if (queryClient) {
    try {
      const { feedService } = await import("@/services/feedService");
      const fullItem = await feedService.getFeedItem(
        feedItemId,
        currentUserId,
      );
      if (fullItem) {
        // Guardar en cache con la misma queryKey que useFeedItem.
        queryClient.setQueryData(
          FEED_KEYS.item(feedItemId, currentUserId),
          fullItem,
        );
        contenidoId = fullItem.postDetails?.id
          || fullItem.reelDetails?.id
          || fullItem.propertyDetails?.id
          || null;
        // tipo_contenido en el FeedItem no es directo; usar item.type
        tipoContenido = fullItem.type || null;
      }
    } catch (err) {
      log.warn("getFeedItem prefetch falló (no crítico):", err);
    }
  }

  // Fallback: select mínimo si no se pudo resolver el item completo.
  if (!contenidoId || !tipoContenido) {
    const { data: feedItem, error: feedError } = await supabase
      .from("feed_items")
      .select("contenido_id, tipo_contenido")
      .eq("id", feedItemId)
      .maybeSingle();

    if (feedError) {
      log.warn("feed_items lookup warning (no crítico):", feedError);
      return null;
    }
    if (!feedItem || !feedItem.contenido_id || !feedItem.tipo_contenido) {
      return null;
    }
    contenidoId = feedItem.contenido_id;
    tipoContenido = feedItem.tipo_contenido;
  }

  // 2) Extraer los ids de highlight del `data` jsonb.
  const commentIds = (data?.comment_ids as string[] | undefined) || [];
  const authorIds = (data?.author_ids as string[] | undefined) || [];

  const highlightParam: Record<string, string> = {
    ...(authorIds.length > 0 ? { highlightUserIds: authorIds.join(",") } : {}),
    ...(authorIds.length > 0 ? { highlightUserId: authorIds[0] } : {}),
    ...(commentIds.length > 0 ? { highlightCommentIds: commentIds.join(",") } : {}),
  };

  // 3) Construir la navegación según el tipo de contenido
  const target = (() => {
    switch (tipoContenido) {
      case "post":
        return {
          pathname: "/(stack)/post/[id]" as const,
          params: { id: contenidoId, ...highlightParam },
        };
      case "propiedad":
        return {
          pathname: "/(stack)/property/[id]" as const,
          params: { id: contenidoId, ...highlightParam },
        };
      case "reel":
        return {
          pathname: "/(stack)/reel/[id]" as const,
          params: { id: contenidoId, ...highlightParam },
        };
      default:
        return {
          pathname: "/(stack)/property/[id]" as const,
          params: { id: contenidoId, ...highlightParam },
        };
    }
  })();

  return () => router.push(target);
}
