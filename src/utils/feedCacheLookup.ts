/**
 * feedCacheLookup.ts
 *
 * Busca un FeedItem en el cache de React Query del feed.
 * Patrón equivalente a selectCachedArgsForQuery de RTK Query:
 * el feed ya trajo los items → el detalle busca en cache → si encuentra, skip fetch.
 *
 * Como el feed usa useInfiniteQuery (páginas) y useFeedItem (item individual),
 * buscamos en TODAS las queries cuyas keys matcheen el prefijo ["feed"].
 */

import { queryClient } from "@/lib/queryClient";
import { FeedItem } from "@/types";

function extractItemsFromData(data: any): FeedItem[] {
  if (!data) return [];
  // useInfiniteQuery → { pages: [...], pageParams: [...] }
  if (Array.isArray(data.pages)) {
    const items: FeedItem[] = [];
    for (const page of data.pages) {
      if (!page) continue;
      if (Array.isArray(page)) items.push(...page);
      else if (Array.isArray(page.items)) items.push(...page.items);
      else if (Array.isArray(page.data)) items.push(...page.data);
    }
    return items;
  }
  // Flat queries → el data es el array real o { items } / { data }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

/**
 * Itera todas las queries del feed en el cache de React Query y busca
 * un FeedItem por su ID. Retorna null si no se encuentra (deep links,
 * notificaciones, etc. — el detalle hará fetch normalmente).
 */
export function findFeedItemInCache(
  feedItemId: string,
  _currentUserId?: string
): FeedItem | null {
  try {
    const cacheEntries = queryClient.getQueriesData({ queryKey: ["feed"] });

    for (const [, data] of cacheEntries) {
      const found = extractItemsFromData(data).find(
        (item) => item.id === feedItemId
      );
      if (found) return found;
    }
  } catch {
    // Si el acceso al cache falla (edge case), retornar null y el detalle hará fetch
  }

  return null;
}