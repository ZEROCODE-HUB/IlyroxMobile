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
import { FeedItem, RecommendedByPreviewUser, User } from "../types";

type ReviewStatsRow = {
  profesional_id: string;
  calificacion_promedio: number | null;
  total_resenas: number | null;
  total_recomiendan: number | null;
  total_no_recomiendan: number | null;
};

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
  const [recommendedByPreviewByUserId, setRecommendedByPreviewByUserId] =
    useState<Record<string, RecommendedByPreviewUser[] | undefined>>({});

  const refreshStatsForUsers = useCallback(async (profesionalIds: string[]) => {
    const ids = Array.from(new Set(profesionalIds.filter(Boolean)));
    if (ids.length === 0) return;

    const { data, error: statsError } = await supabase
      .from("vw_estadisticas_resenas")
      .select(
        "profesional_id,calificacion_promedio,total_resenas,total_recomiendan,total_no_recomiendan"
      )
      .in("profesional_id", ids);

    if (statsError) return;

    const rows = ((data || []) as unknown as ReviewStatsRow[]) || [];
    const byId = new Map(rows.map((r) => [r.profesional_id, r]));

    setItems((prev) =>
      prev.map((it) => {
        const stats = byId.get(it.user.id);
        if (!stats) return it;

        return {
          ...it,
          user: {
            ...it.user,
            rating:
              typeof stats.calificacion_promedio === "number"
                ? stats.calificacion_promedio
                : 0,
            totalRatings:
              typeof stats.total_resenas === "number" ? stats.total_resenas : 0,
            positiveRecommendations:
              typeof stats.total_recomiendan === "number"
                ? stats.total_recomiendan
                : 0,
            negativeRecommendations:
              typeof stats.total_no_recomiendan === "number"
                ? stats.total_no_recomiendan
                : 0,
          },
        };
      })
    );
  }, []);

  const fetchRecommendedByPreviewForUsers = useCallback(
    async (
      profesionalIds: string[],
      options?: {
        force?: boolean;
      }
    ) => {
      const ids = Array.from(new Set(profesionalIds.filter(Boolean)));
      if (ids.length === 0) return;

      const targetIds = options?.force
        ? ids
        : ids.filter((id) => recommendedByPreviewByUserId[id] === undefined);

      if (targetIds.length === 0) return;

      const recIdsByUserId = new Map<string, string[]>();

      let i = 0;
      const concurrency = Math.min(5, targetIds.length);
      const workers = Array.from({ length: concurrency }, () =>
        (async () => {
          while (i < targetIds.length) {
            const current = targetIds[i];
            i += 1;

            const { data, error: recError } = await supabase
              .from("recomendaciones_usuarios")
              .select("recomendado_por")
              .eq("usuario_recomendado_id", current)
              .eq("recomienda", true)
              .range(0, 1);

            if (recError) {
              recIdsByUserId.set(current, []);
              continue;
            }

            const idsForUser = (data || [])
              .map((r: any) => r?.recomendado_por)
              .filter(Boolean) as string[];
            recIdsByUserId.set(current, Array.from(new Set(idsForUser)));
          }
        })()
      );

      await Promise.all(workers);

      const allRecommenderIds = Array.from(
        new Set(Array.from(recIdsByUserId.values()).flat())
      );

      const profilesById = new Map<
        string,
        { name: string; avatar: string | null }
      >();

      if (allRecommenderIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("perfiles")
          .select("id,nombre,apellido_paterno,apellido_materno,foto")
          .in("id", allRecommenderIds);

        if (!profilesError) {
          (profilesData || []).forEach((p: any) => {
            const name = [p?.nombre, p?.apellido_paterno, p?.apellido_materno]
              .filter(Boolean)
              .join(" ")
              .trim();
            profilesById.set(p.id, {
              name: name || "Usuario",
              avatar: p?.foto ?? null,
            });
          });
        }
      }

      setRecommendedByPreviewByUserId((prev) => {
        const next = { ...prev };
        targetIds.forEach((id) => {
          const recommenderIds = recIdsByUserId.get(id) || [];
          next[id] = recommenderIds
            .map((rid) => {
              const info = profilesById.get(rid);
              if (!info) return null;
              return {
                id: rid,
                name: info.name,
                avatar: info.avatar,
              } satisfies RecommendedByPreviewUser;
            })
            .filter(Boolean) as RecommendedByPreviewUser[];
        });
        return next;
      });
    },
    [recommendedByPreviewByUserId]
  );

  /**
   * useEffect: Actualizar items cuando se cargan los previews
   * FIX: Esto reemplaza los useEffect comentados pero SIN crear loop
   */
  useEffect(() => {
    // Solo actualizar si hay items y previews cargados
    if (items.length === 0 || Object.keys(recommendedByPreviewByUserId).length === 0) {
      return;
    }

    setItems((prev) =>
      prev.map((it) => {
        const preview = recommendedByPreviewByUserId[it.user.id];
        // Si no hay preview o ya lo tiene, no cambiar
        if (!preview || it.user.recommendedByPreview === preview) {
          return it;
        }
        return {
          ...it,
          user: {
            ...it.user,
            recommendedByPreview: preview,
          },
        };
      })
    );
  }, [recommendedByPreviewByUserId]); // Solo depende de recommendedByPreviewByUserId

  /*
  useEffect(() => {
    if (items.length === 0) return;
    const ids = items.map((it) => it.user?.id).filter(Boolean) as string[];
    fetchRecommendedByPreviewForUsers(ids);
  }, [items, fetchRecommendedByPreviewForUsers]);

  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        const preview = recommendedByPreviewByUserId[it.user.id];
        if (preview === undefined) return it;
        return {
          ...it,
          user: {
            ...it.user,
            recommendedByPreview: preview,
          },
        };
      })
    );
  }, [recommendedByPreviewByUserId]);
  */
  /*
 useEffect(() => {
    const pending = new Set<string>();
    let timer: any = null;

    const schedule = (id: string | null | undefined) => {
      if (!id) return;
      pending.add(id);

      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const ids = Array.from(pending);
        pending.clear();
        refreshStatsForUsers(ids);
        fetchRecommendedByPreviewForUsers(ids, { force: true });
      }, 250);
    };

    const channel = supabase
      .channel("feed-user-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "recomendaciones_usuarios" },
        (payload: any) => {
          const record = payload?.new || payload?.old;
          schedule(record?.usuario_recomendado_id);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resenas" },
        (payload: any) => {
          const record = payload?.new || payload?.old;
          schedule(record?.profesional_id);
        }
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [refreshStatsForUsers]);
  */

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

        const perfilIds = Array.from(
          new Set(
            (feedData || [])
              .map((item: any) => (item.perfiles as any)?.id)
              .filter(Boolean) as string[]
          )
        );

        const statsPromise =
          perfilIds.length > 0
            ? supabase
                .from("vw_estadisticas_resenas")
                .select(
                  "profesional_id,calificacion_promedio,total_resenas,total_recomiendan,total_no_recomiendan"
                )
                .in("profesional_id", perfilIds)
            : Promise.resolve({ data: [], error: null } as any);

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
        const [postsData, reelsData, propertiesData, statsData] =
          await Promise.all([
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
                created_at,
                codigo_propiedad,
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
            statsPromise,
          ]);

        // 4. Crear mapas para lookup rápido
        const postsMap = new Map(postsData.data?.map((p) => [p.id, p]) || []);
        const reelsMap = new Map(reelsData.data?.map((r) => [r.id, r]) || []);
        const propertiesMap = new Map(
          (propertiesData.data?.map((p) => [p.id, p] as [string, any]) ||
            []) as Iterable<[string, any]>
        );
        const statsRows =
          ((statsData?.data || []) as unknown as ReviewStatsRow[]) || [];
        const statsByUserId = new Map<string, ReviewStatsRow>(
          statsRows.map((s) => [s.profesional_id, s])
        );

        // 5. Combinar todo en FeedItems
        const feedItems = feedData
          .map((item) => {
            // Extraer perfil con optional chaining para evitar errores
            const perfil = item.perfiles as any;

            const stats = perfil?.id ? statsByUserId.get(perfil.id) : null;
            const recommendedByPreview = perfil?.id
              ? recommendedByPreviewByUserId[perfil.id]
              : undefined;

            const user: User = {
              id: perfil?.id || "",
              nombre: perfil?.nombre || "Usuario",
              name: perfil?.nombre || "Usuario",
              avatar: perfil?.foto || "https://placehold.co/100x100",
              isFollowing: false,
              role: (perfil?.rol === "agente" ? "Agent" : "User") as any,
              rating:
                typeof stats?.calificacion_promedio === "number"
                  ? stats.calificacion_promedio
                  : 0,
              totalRatings:
                typeof stats?.total_resenas === "number"
                  ? stats.total_resenas
                  : 0,
              positiveRecommendations:
                typeof stats?.total_recomiendan === "number"
                  ? stats.total_recomiendan
                  : 0,
              negativeRecommendations:
                typeof stats?.total_no_recomiendan === "number"
                  ? stats.total_no_recomiendan
                  : 0,
              recommendedByPreview,
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
                  code: property.codigo_propiedad || undefined,
                  title: `${property.tipo} en ${property.ciudad}`,
                  description: property.descripcion,
                  price: operation?.precio || 0,
                  currency: (operation?.moneda || "MXN") as "USD" | "MXN",
                  createdAt: property.created_at,
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
const userIds = feedItems.map((it) => it.user?.id).filter(Boolean) as string[];
if (userIds.length > 0) {
  fetchRecommendedByPreviewForUsers(userIds);
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
    [pageSize, recommendedByPreviewByUserId]
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

  const refreshUserStats = useCallback(() => {
    const ids = items.map((it) => it.user?.id).filter(Boolean) as string[];
    refreshStatsForUsers(ids);
    fetchRecommendedByPreviewForUsers(ids, { force: true });
  }, [items, refreshStatsForUsers, fetchRecommendedByPreviewForUsers]);

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
    refreshUserStats,
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
