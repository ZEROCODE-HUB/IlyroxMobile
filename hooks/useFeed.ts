/**
 * useFeed.ts
 * Hook principal para cargar el feed con algoritmo de engagement
 *
 * FEATURES:
 * - Carga feed con score de engagement
 * - Paginación infinita
 * - Refresh automático
 * - Combina posts, reels y propiedades
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { FeedItem, User } from "../types";

interface UseFeedOptions {
  userId?: string;
  pageSize?: number;
  enableAutoRefresh?: boolean;
}

export function useFeed(options: UseFeedOptions = {}) {
  const { userId, pageSize = 10, enableAutoRefresh = true } = options;

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calcular factor de decaimiento temporal
   * 0-24h: 1.0, 1-3d: 0.8, 3-7d: 0.5, 7-30d: 0.3, 30+d: 0.1
   */
  const calculateTimeFactor = (timestamp: string): number => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const hoursDiff = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) return 1.0;
    if (hoursDiff < 72) return 0.8;
    if (hoursDiff < 168) return 0.5;
    if (hoursDiff < 720) return 0.3;
    return 0.1;
  };

  /**
   * Cargar items del feed
   */
  const loadFeed = useCallback(
    async (pageNum: number, isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        // 1. Cargar feed_items con engagement score
        const { data: feedData, error: feedError } = await supabase
          .from("feed_items")
          .select(
            `
          id,
          tipo_contenido,
          contenido_id,
          publicado_por,
          publicado_en,
          engagement_score,
          vistas_count,
          likes_count,
          comentarios_count,
          estado_moderacion,
          perfiles!feed_items_publicado_por_fkey (
            id,
            nombre,
            foto,
            rol
          )
        `
          )
          .eq("estado_moderacion", "activo")
          .is("deleted_at", null)
          .order("engagement_score", { ascending: false })
          .order("publicado_en", { ascending: false })
          .range(pageNum * pageSize, (pageNum + 1) * pageSize - 1);

        if (feedError) throw feedError;

        if (!feedData || feedData.length === 0) {
          setHasMore(false);
          return;
        }

        // 2. Separar por tipo de contenido
        const postIds = feedData
          .filter((item) => item.tipo_contenido === "post")
          .map((item) => item.contenido_id);

        const reelIds = feedData
          .filter((item) => item.tipo_contenido === "reel")
          .map((item) => item.contenido_id);

        const propertyIds = feedData
          .filter((item) => item.tipo_contenido === "propiedad")
          .map((item) => item.contenido_id);

        // 3. Cargar contenido de cada tipo
        const [postsData, reelsData, propertiesData] = await Promise.all([
          postIds.length > 0
            ? supabase.from("posts").select("*").in("id", postIds)
            : { data: [], error: null },
          reelIds.length > 0
            ? supabase.from("reels").select("*").in("id", reelIds)
            : { data: [], error: null },
          propertyIds.length > 0
            ? supabase
                .from("propiedades")
                .select(
                  `
                id,
                tipo,
                subtipo,
                ciudad,
                municipio,
                fotos,
                habitaciones,
                banos,
                estacionamientos,
                metros_cuadrados_construccion,
                metros_cuadrados_terreno,
                descripcion,
                operaciones_propiedad!inner (
                  tipo_operacion,
                  precio,
                  moneda
                )
              `
                )
                .in("id", propertyIds)
            : { data: [], error: null },
        ]);

        // 4. Crear mapas para lookup rápido
        const postsMap = new Map(postsData.data?.map((p) => [p.id, p]) || []);
        const reelsMap = new Map(reelsData.data?.map((r) => [r.id, r]) || []);
        const propertiesMap = new Map(
          (propertiesData.data?.map((p) => [p.id, p] as [string, any]) ||
            []) as Iterable<[string, any]>
        );

        // 5. Combinar todo en FeedItems
        const feedItems = feedData
          .map((item) => {
            // Extraer perfil con optional chaining para evitar errores
            const perfil = item.perfiles as any;

            const user: User = {
              id: perfil?.id || "",
              nombre: perfil?.nombre || "Usuario",
              name: perfil?.nombre || "Usuario",
              avatar: perfil?.foto || "https://placehold.co/100x100",
              isFollowing: false,
              role: (perfil?.rol === "agente" ? "Agent" : "User") as any,
            };

            // Calcular score final con decaimiento temporal
            const timeFactor = calculateTimeFactor(item.publicado_en);
            const finalScore = item.engagement_score * timeFactor;

            // Post
            if (item.tipo_contenido === "post") {
              const post = postsMap.get(item.contenido_id);
              if (!post) return null;

              return {
                id: item.id,
                type: "post" as const,
                user,
                content: post.contenido || "",
                images: post.imagenes || [],
                likes: item.likes_count,
                comments: item.comentarios_count,
                timestamp: formatTimestamp(item.publicado_en),
                commentsList: [],
              };
            }

            // Reel
            if (item.tipo_contenido === "reel") {
              const reel = reelsMap.get(item.contenido_id);
              if (!reel) return null;

              return {
                id: item.id,
                type: "reel" as const,
                user,
                content: reel.descripcion || "",
                videoUrl: reel.video_url,
                likes: item.likes_count,
                comments: item.comentarios_count,
                timestamp: formatTimestamp(item.publicado_en),
                commentsList: [],
              };
            }

            // Propiedad
            if (item.tipo_contenido === "propiedad") {
              const property = propertiesMap.get(item.contenido_id);
              if (!property) return null;

              // Obtener primera operación (puede haber varias)
              const operation = Array.isArray(property.operaciones_propiedad)
                ? property.operaciones_propiedad[0]
                : property.operaciones_propiedad;

              return {
                id: item.id,
                type: "property" as const,
                user,
                content: property.descripcion || "",
                likes: item.likes_count,
                comments: item.comentarios_count,
                timestamp: formatTimestamp(item.publicado_en),
                commentsList: [],
                propertyDetails: {
                  id: property.id,
                  title: `${property.tipo} en ${property.ciudad}`,
                  description: property.descripcion,
                  price: operation?.precio || 0,
                  currency: (operation?.moneda || "MXN") as "USD" | "MXN",
                  location: {
                    address: `${property.municipio}, ${property.ciudad}`,
                    country: "México",
                    state: property.ciudad || "",
                    city: property.municipio || "",
                    colony: "",
                  },
                  images: property.fotos || [],
                  features: {
                    beds: property.habitaciones || 0,
                    baths: property.banos || 0,
                    parking: property.estacionamientos,
                    constructionSqft:
                      property.metros_cuadrados_construccion || 0,
                    landSqft: property.metros_cuadrados_terreno || 0,
                  },
                  amenities: [],
                  type: "habitacional" as const,
                  subtype: property.subtipo || property.tipo,
                  operation: (operation?.tipo_operacion === "venta"
                    ? "Publicada"
                    : "Rentada") as "Publicada" | "Rentada",
                  status: "Available" as const,
                },
              };
            }

            return null;
          })
          .filter((item) => item !== null) as FeedItem[];

        // 6. Actualizar estado
        if (isRefresh) {
          setItems(feedItems);
          setPage(0);
        } else {
          setItems((prev) => [...prev, ...feedItems]);
        }

        setHasMore(feedData.length === pageSize);
        setError(null);
      } catch (err) {
        console.error("Error loading feed:", err);
        setError(err instanceof Error ? err.message : "Error loading feed");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pageSize]
  );

  /**
   * Cargar más items (scroll infinito)
   */
  const loadMore = useCallback(() => {
    if (!loading && !refreshing && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadFeed(nextPage, false);
    }
  }, [loading, refreshing, hasMore, page, loadFeed]);

  /**
   * Refrescar feed
   */
  const refresh = useCallback(() => {
    loadFeed(0, true);
  }, [loadFeed]);

  /**
   * Cargar inicial
   */
  useEffect(() => {
    loadFeed(0, false);
  }, []);

  /**
   * Auto-refresh cada 30 segundos (opcional)
   */
  useEffect(() => {
    if (!enableAutoRefresh) return;

    const interval = setInterval(() => {
      refresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [enableAutoRefresh, refresh]);

  return {
    items,
    loading,
    refreshing,
    hasMore,
    error,
    loadMore,
    refresh,
  };
}

/**
 * Formatear timestamp a texto relativo
 */
function formatTimestamp(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}
