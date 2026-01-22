import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";

export interface FeedItemData {
  id: string;
  contenido_id: string;
  likes_count: number;
  comentarios_count: number;
}

/**
 * Hook para obtener los FeedItems asociados a una lista de propiedades.
 * Útil para obtener IDs reales de feed_items (necesarios para likes/comments)
 * cuando solo tenemos IDs de propiedades.
 */
export function usePropertyFeedItems(propertyIds: string[]) {
  return useQuery({
    queryKey: ["propertyFeedItems", propertyIds.sort().join(",")], // Sort to ensure stable key
    queryFn: async () => {
      if (!propertyIds || propertyIds.length === 0) return {};

      const { data, error } = await supabase
        .from("feed_items")
        .select("id, contenido_id, likes_count, comentarios_count")
        .eq("tipo_contenido", "propiedad")
        .in("contenido_id", propertyIds);

      if (error) {
        console.error("Error fetching feed items:", error);
        throw error;
      }

      const map: Record<string, FeedItemData> = {};
      data?.forEach((item) => {
        map[item.contenido_id] = item;
      });

      return map;
    },
    enabled: propertyIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
