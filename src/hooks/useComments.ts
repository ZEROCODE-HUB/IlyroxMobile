/**
 * useComments.ts
 * Hook para manejar comentarios con Optimistic Updates
 *
 * FEATURES:
 * - Paginación real a nivel de query (useInfiniteQuery + keyset cursor)
 *   Orden DESC (nuevos arriba) por `created_at, id` (desempata timestamps).
 * - Comentarios con Optimistic Updates (aparecen instantáneamente)
 * - Upload de imágenes a Supabase Storage
 * - Respuestas anidadas
 * - Rollback automático en errores
 * - Estado compartido con React Query
 * - Soporte para highlight de notificaciones:
 *   recibe `highlightCommentIds` (los comment_ids exactos del payload
 *   `data->'comment_ids'` de user_notifications) y resuelve el thread
 *   en la primera página vía la RPC get_comment_thread_for_notification,
 *   garantizando que el comentario destacado (root o reply) se renderice
 *   con su contexto y aparezca arriba.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { Comment } from "../types";
import { useToast } from "../context/ToastContext";
import { useImageUpload } from "./useImageUpload";
import { logger } from "@/utils/logger";
import { PAGINATION } from "@/constants/config";

const log = logger.scoped("useComments");
const PAGE_SIZE = PAGINATION.COMMENTS_PAGE_SIZE ?? 20;

type PerfilData = {
  id: string;
  nombre: string;
  foto: string | null;
};

interface LikeComentario {
  usuario_id: string;
}

interface UseCommentsOptions {
  feedItemId: string;
  userId?: string;
  userProfile?: {
    id: string;
    nombre: string;
    foto: string | null;
  };
  /**
   * Ids exactos de comentarios a destacar, provenientes de la notificación
   * (`user_notifications.data->'comment_ids'`). En la primera página se
   * resuelven sus threads y se anteponen al resultado, garantizando que
   * los comentarios del notificado aparezcan SIEMPRE visibles y marcados.
   */
  highlightCommentIds?: string[];
  /**
   * Ids de autores a destacar (fallback legacy). Las raíces cuyos autores
   * coincidan se elevan a la cabeza del FlatList.
   */
  highlightUserIds?: string[];
}

interface CommentsPageData {
  comments: Comment[];
  nextCursor: { created_at: string; id: string } | null;
}

type CommentsInfinite = {
  pages: CommentsPageData[];
  pageParams: Array<{ created_at: string; id: string } | undefined>;
};

function dedupeById(list: Comment[]): Comment[] {
  const seen = new Set<string>();
  const out: Comment[] = [];
  for (const c of list) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

function rePaginate(flat: Comment[]): CommentsPageData[] {
  if (flat.length === 0) return [];
  const pages: CommentsPageData[] = [];
  for (let i = 0; i < flat.length; i += PAGE_SIZE) {
    pages.push({
      comments: flat.slice(i, i + PAGE_SIZE),
      nextCursor: null,
    });
  }
  // El nextCursor se asigna después en el queryFn a partir de la última raíz;
  // aquí solo partimos en páginas.
  return pages;
}

function mapCommentRow(c: any, userId?: string): Comment {
  const perfil = Array.isArray(c.perfiles) ? c.perfiles[0] : c.perfiles;
  return {
    id: c.id,
    user: {
      id: perfil?.id || "",
      nombre: perfil?.nombre || "Usuario",
      name: perfil?.nombre || "Usuario",
      avatar: perfil?.foto || undefined,
      isFollowing: false,
      role: "User" as const,
    },
    text: c.contenido || "",
    timestamp: formatTimestamp(c.created_at),
    imageUrl: Array.isArray(c.imagenes) ? c.imagenes[0] : c.imagenes?.[0],
    parentId: c.parent_comentario_id,
    isLiked: c.likes_comentarios?.some(
      (l: LikeComentario) => l.usuario_id === userId,
    ),
  };
}

/**
 * Ensambla, a partir de las raíces de la página y sus replies (queries
 * separadas), una lista plana en orden "raíz + sus replies", en DESC.
 * Esto preserva el contrato de renderizado (raíz primero, replies anidadas
 * debajo) sin necesidad de paginar dentro de cada sub-hilo.
 */
function assemblePage(
  roots: any[],
  repliesByParent: Map<string, any[]>,
  userId?: string,
): Comment[] {
  // Las raíces ya vienen DESC. Para cada raíz, su root comment + replies asc.
  const result: Comment[] = [];
  for (const r of roots) {
    const rootComment = mapCommentRow(r, userId);
    result.push(rootComment);
    const replies = repliesByParent.get(r.id) || [];
    for (const reply of replies) {
      result.push(mapCommentRow(reply, userId));
    }
  }
  return result;
}

const CURSOR_OR = (c: { created_at: string; id: string }) =>
  `created_at.lt.${c.created_at},and(created_at.eq.${c.created_at},id.lt.${c.id})`;

export function useComments({
  feedItemId,
  userId,
  userProfile,
  highlightCommentIds,
  highlightUserIds,
}: UseCommentsOptions) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["comments", feedItemId];
  const commentCountKey = ["commentCount", feedItemId];
  const { uploadImage } = useImageUpload();

  const hasHighlightIds = (highlightCommentIds?.length ?? 0) > 0;

  // `root_ids` exactos que la RPC `get_comment_thread_for_notification`
  // devolvió para los `highlightCommentIds`. El RPC ya resuelve el caso
  // REPLY subiendo recursivamente al root ancestral, por lo que estos ids
  // son la única fuente de verdad para qué raíces deben elevarse al tope.
  // Es `useState` (no `useRef`) para que el cambio dispare re-render del
  // sheet y la elevación surta efecto cuando el state llega después del
  // primer render. Se resetea al cambiar de post o de highlight ids.
  const [highlightedRootIds, setHighlightedRootIds] = useState<
    string[] | undefined
  >(undefined);
  const lastHighlightKeyRef = useRef<string>("");

  // Reset defensivo: si cambia el post o el set de highlight, limpiamos
  // los root_ids para que no se muestre un highlight del post anterior.
  useEffect(() => {
    const key = `${feedItemId}:${(highlightCommentIds ?? []).join(",")}`;
    if (lastHighlightKeyRef.current !== key) {
      lastHighlightKeyRef.current = key;
      setHighlightedRootIds(undefined);
    }
  }, [feedItemId, highlightCommentIds]);

  /**
   * Página de comentarios keyset DESC (root comments + sus replies).
   * Si `cursor` es undefined → primera página.
   * Si hay `highlightCommentIds` y es la primera página, se ejecuta además
   * la RPC get_comment_thread_for_notification y se antepone el thread
   * resuelto (dedup por id).
   */
  const fetchCommentsPage = async (
    cursor: { created_at: string; id: string } | undefined,
  ): Promise<CommentsPageData> => {
    let rootsQuery = supabase
      .from("comentarios")
      .select(
        `
        id,
        contenido,
        created_at,
        parent_comentario_id,
        nivel_anidacion,
        imagenes,
        publicado_por,
        perfiles!comentarios_publicado_por_fkey (
          id,
          nombre,
          foto
        ),
        likes_comentarios (
          id,
          usuario_id
        )
      `,
      )
      .eq("feed_item_id", feedItemId)
      .is("parent_comentario_id", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor) {
      rootsQuery = rootsQuery.or(CURSOR_OR(cursor));
    }

    const { data: rootsData, error: rootsError } = await rootsQuery;
    if (rootsError) throw rootsError;

    const roots = (rootsData as any[]) || [];
    const rootIds = roots.map((r) => r.id);

    let repliesByParent = new Map<string, any[]>();
    if (rootIds.length > 0) {
      const { data: repliesData, error: repliesError } = await supabase
        .from("comentarios")
        .select(
          `
          id,
          contenido,
          created_at,
          parent_comentario_id,
          nivel_anidacion,
          imagenes,
          publicado_por,
          perfiles!comentarios_publicado_por_fkey (
            id,
            nombre,
            foto
          ),
          likes_comentarios (
            id,
            usuario_id
          )
        `,
        )
        .in("parent_comentario_id", rootIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

      if (repliesError) {
        log.warn("Replies fetch warning (no crítico):", repliesError);
      } else {
        for (const reply of (repliesData as any[]) || []) {
          const arr = repliesByParent.get(reply.parent_comentario_id) || [];
          arr.push(reply);
          repliesByParent.set(reply.parent_comentario_id, arr);
        }
      }
    }

    let comments = assemblePage(roots, repliesByParent, userId);

    // --- Highlight: resolver threads en la primera página ---
    if (!cursor && hasHighlightIds && highlightCommentIds) {
      try {
        const { data: threadData, error: threadError } = await supabase.rpc(
          "get_comment_thread_for_notification",
          {
            p_feed_item_id: feedItemId,
            p_comment_ids: highlightCommentIds,
          },
        );

        if (threadError) {
          log.warn(
            "get_comment_thread_for_notification warning (no crítico):",
            threadError,
          );
        } else {
          const threadComments = (threadData?.comments as any[]) || [];
          const threadRootIds = (threadData?.root_ids as string[]) || [];

          // Guardar los root_ids exactos que devolvió la RPC (incluye el
          // root ancestral para el caso REPLY). Es la única fuente de verdad
          // para qué raíces deben elevarse al tope de la lista.
          setHighlightedRootIds(
            threadRootIds.length > 0 ? threadRootIds : undefined,
          );

          if (threadComments.length > 0) {
            // Traer el perfil y likes de los thread comments (la RPC no incluye
            // likes_comentarios; consultamos aparte solo para estos ids).
            const threadIds = threadComments.map((t) => t.id);
            const { data: threadLikes } = await supabase
              .from("comentarios")
              .select(
                `
                id,
                likes_comentarios ( id, usuario_id )
              `,
              )
              .in("id", threadIds);

            const likesById = new Map<string, any[]>();
            for (const row of (threadLikes as any[]) || []) {
              likesById.set(row.id, row.likes_comentarios || []);
            }

            // Crear objetos Comment en la forma esperada
            const threadAsComments: Comment[] = threadComments.map((t: any) => {
              const perfil = t.perfil || {};
              const likes = likesById.get(t.id) || [];
              return {
                id: t.id,
                user: {
                  id: perfil.id || "",
                  nombre: perfil.nombre || "Usuario",
                  name: perfil.nombre || "Usuario",
                  avatar: perfil.foto || undefined,
                  isFollowing: false,
                  role: "User" as const,
                },
                text: t.contenido || "",
                timestamp: formatTimestamp(t.created_at),
                imageUrl: Array.isArray(t.imagenes) ? t.imagenes[0] : undefined,
                parentId: t.parent_comentario_id,
                isLiked: likes.some((l: LikeComentario) => l.usuario_id === userId),
              };
            });

            // Necesitamos el orden "raíz + sus replies" para los threads.
            // La RPC devuelve threads ya en formato jsonb; re-ordenamos.
            const orderedThread: Comment[] = [];
            for (const rootId of threadRootIds) {
              const root = threadAsComments.find(
                (c) => c.id === rootId && !c.parentId,
              );
              if (root) orderedThread.push(root);
              for (const c of threadAsComments) {
                if (c.parentId === rootId) orderedThread.push(c);
              }
            }

            // Anteponer al resultado de la página (dedup por id).
            comments = dedupeById([...orderedThread, ...comments]);
          }
        }
      } catch (err) {
        log.warn("Highlight capture warning (no crítico):", err);
      }
    }

    const lastRoot = roots[roots.length - 1];
    const nextCursor =
      roots.length === PAGE_SIZE && lastRoot
        ? { created_at: lastRoot.created_at, id: lastRoot.id }
        : null;

    return { comments, nextCursor };
  };

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
    hasNextPage,
    error: commentsError,
  } = useInfiniteQuery<CommentsPageData, Error>({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchCommentsPage(pageParam as { created_at: string; id: string } | undefined),
    initialPageParam: undefined as { created_at: string; id: string } | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled: Boolean(feedItemId),
  });

  // Aplanar páginas a un único array DESC, con dedup (los threads destacados
  // pueden coincidir con raíces del keyset; queremos una sola vez cada id).
  const comments: Comment[] = useMemo(() => {
    if (!data) return [];
    return dedupeById(data.pages.flatMap((p) => p.comments));
  }, [data]);

  /**
   * Query del contador total (reusa la misma key que ya tocaban las
   * mutaciones para mantener la coherencia del cache).
   */
  const { data: totalCount } = useQuery<number>({
    queryKey: commentCountKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feed_items")
        .select("comentarios_count")
        .eq("id", feedItemId)
        .maybeSingle();
      if (error) throw error;
      return data?.comentarios_count ?? 0;
    },
    staleTime: 60_000,
  });

  /**
   * Mutation: Agregar comentario con Optimistic Update (prepend = nuevo arriba).
   */
  const addCommentMutation = useMutation({
    mutationFn: async ({
      text,
      imageUri,
      parentCommentId,
    }: {
      text?: string;
      imageUri?: string;
      parentCommentId?: string;
    }) => {
      if (!userId) throw new Error("No auth");

      let imageUrl: string | null = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri, "feed-images", "comments");
        if (!imageUrl) throw new Error("Error subiendo imagen");
      }

      let nivelAnidacion = 0;
      if (parentCommentId) {
        const { data: parentData } = await supabase
          .from("comentarios")
          .select("nivel_anidacion")
          .eq("id", parentCommentId)
          .maybeSingle();

        nivelAnidacion = (parentData?.nivel_anidacion || 0) + 1;
      }

      const { data, error } = await supabase
        .from("comentarios")
        .insert({
          feed_item_id: feedItemId,
          publicado_por: userId,
          contenido: text?.trim() || "",
          imagenes: imageUrl ? [imageUrl] : null,
          parent_comentario_id: parentCommentId || null,
          nivel_anidacion: nivelAnidacion,
        })
        .select(
          `
          id,
          contenido,
          created_at,
          parent_comentario_id,
          nivel_anidacion,
          imagenes,
          perfiles!comentarios_publicado_por_fkey (
            id,
            nombre,
            foto
          )
        `,
        )
        .single();

      if (error) throw error;

      return data;
    },

    onMutate: async ({ text, imageUri, parentCommentId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousInfinite =
        queryClient.getQueryData<CommentsInfinite>(queryKey);
      const previousFlat = previousInfinite
        ? dedupeById(previousInfinite.pages.flatMap((p) => p.comments))
        : [];

      const tempComment: Comment = {
        id: `temp_${Date.now()}`,
        user: {
          id: userProfile?.id || userId || "",
          nombre: userProfile?.nombre || "Tú",
          name: userProfile?.nombre || "Tú",
          avatar: userProfile?.foto ?? "",
          isFollowing: false,
          role: "User" as const,
        },
        text: text?.trim() || "",
        timestamp: "Enviando...",
        imageUrl: imageUri,
        parentId: parentCommentId,
        isLiked: false,
      };

      // DESC = prepend (nuevo arriba). Si es reply, mantenerlo justo
      // después de su raíz para que el renderizado sea coherente.
      let newFlat: Comment[];
      if (parentCommentId) {
        const parentIdx = previousFlat.findIndex(
          (c) => c.id === parentCommentId,
        );
        if (parentIdx >= 0) {
          newFlat = [
            ...previousFlat.slice(0, parentIdx + 1),
            tempComment,
            ...previousFlat.slice(parentIdx + 1),
          ];
        } else {
          newFlat = [tempComment, ...previousFlat];
        }
      } else {
        newFlat = [tempComment, ...previousFlat];
      }

      queryClient.setQueryData<CommentsInfinite>(queryKey, {
        pages: rePaginate(dedupeById(newFlat)),
        pageParams: [undefined],
      });

      await queryClient.cancelQueries({ queryKey: commentCountKey });
      const previousCount = queryClient.getQueryData<number>(commentCountKey);
      queryClient.setQueryData<number>(commentCountKey, (old) => (old ?? 0) + 1);

      return { previousInfinite, previousCount, tempComment };
    },

    onSuccess: (data, variables, context: any) => {
      queryClient.setQueryData<CommentsInfinite>(queryKey, (old) => {
        if (!old) return old;
        const flat = dedupeById(old.pages.flatMap((p) => p.comments));
        const filtered = flat.filter((c) => c.id !== context.tempComment.id);
        const perfil = Array.isArray(data.perfiles)
          ? data.perfiles[0]
          : data.perfiles;
        const realComment: Comment = {
          id: data.id,
          user: {
            id: (perfil as PerfilData)?.id || "",
            nombre: (perfil as PerfilData)?.nombre || "Usuario",
            name: (perfil as PerfilData)?.nombre || "Usuario",
            avatar: (perfil as PerfilData)?.foto ?? "",
            isFollowing: false,
            role: "User" as const,
          },
          text: data.contenido || "",
          timestamp: "Ahora",
          imageUrl: Array.isArray(data.imagenes) ? data.imagenes[0] : undefined,
          parentId: data.parent_comentario_id,
          isLiked: false,
        };
        // Mantener la posición del temp: anteponer si era root, justo
        // tras la raíz si era reply.
        const parentId = realComment.parentId;
        let nextFlat: Comment[];
        if (parentId) {
          const parentIdx = filtered.findIndex((c) => c.id === parentId);
          if (parentIdx >= 0) {
            nextFlat = [
              ...filtered.slice(0, parentIdx + 1),
              realComment,
              ...filtered.slice(parentIdx + 1),
            ];
          } else {
            nextFlat = [realComment, ...filtered];
          }
        } else {
          nextFlat = [realComment, ...filtered];
        }
        return {
          pages: rePaginate(nextFlat),
          pageParams: [undefined],
        };
      });
    },

    onError: (err, variables, context: any) => {
      if (context?.previousInfinite) {
        queryClient.setQueryData<CommentsInfinite>(
          queryKey,
          context.previousInfinite,
        );
      }
      if (typeof context?.previousCount === "number") {
        queryClient.setQueryData<number>(
          commentCountKey,
          context.previousCount,
        );
      }
      log.error("Error adding comment:", err);
      showToast("Error de conexión", "error");
    },
    retry: (failureCount, error: any) => {
      if (
        error?.message === "No auth" ||
        error?.status === 400 ||
        error?.status === 403 ||
        error?.status === 401
      ) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const addComment = async (
    text?: string,
    imageUri?: string,
    parentCommentId?: string,
  ): Promise<boolean> => {
    if (!userId) {
      showToast("Debes iniciar sesión", "warning");
      return false;
    }
    if (!text?.trim() && !imageUri) {
      showToast("El comentario debe tener texto o imagen", "warning");
      return false;
    }
    try {
      await addCommentMutation.mutateAsync({
        text: text || "",
        imageUri,
        parentCommentId,
      });
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Toggle like en comentario con Optimistic Update.
   * La forma de cache es infinita, por lo que mapeamos a través de pages.
   */
  const toggleCommentLikeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!userId) throw new Error("No auth");

      const { data: existing } = await supabase
        .from("likes_comentarios")
        .select("id")
        .eq("comentario_id", commentId)
        .eq("usuario_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("likes_comentarios")
          .delete()
          .eq("comentario_id", commentId)
          .eq("usuario_id", userId);
        return { action: "unlike" as const };
      } else {
        await supabase.from("likes_comentarios").insert({
          comentario_id: commentId,
          usuario_id: userId,
        });
        return { action: "like" as const };
      }
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousInfinite =
        queryClient.getQueryData<CommentsInfinite>(queryKey);
      if (previousInfinite) {
        queryClient.setQueryData<CommentsInfinite>(queryKey, {
          ...previousInfinite,
          pages: previousInfinite.pages.map((p) => ({
            ...p,
            comments: p.comments.map((c) =>
              c.id === commentId ? { ...c, isLiked: !c.isLiked } : c,
            ),
          })),
        });
      }
      return { previousInfinite };
    },
    onError: (err, commentId, context: any) => {
      if (context?.previousInfinite) {
        queryClient.setQueryData<CommentsInfinite>(
          queryKey,
          context.previousInfinite,
        );
      }
      showToast("Error al procesar el like", "error");
    },
  });

  const toggleCommentLike = async (commentId: string): Promise<boolean> => {
    if (!userId) {
      showToast("Debes iniciar sesión", "warning");
      return false;
    }
    try {
      await toggleCommentLikeMutation.mutateAsync(commentId);
      return true;
    } catch (error) {
      log.error("Error toggling comment like:", error);
      showToast("Error al dar like", "error");
      return false;
    }
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return {
    comments,
    totalCount: typeof totalCount === "number" ? totalCount : comments.length,
    loading: isLoading,
    loadingMore: isFetchingNextPage,
    hasMore: Boolean(hasNextPage),
    loadMore,
    posting: addCommentMutation.isPending,
    error: commentsError ? commentsError.message : null,
    addComment,
    toggleCommentLike,
    refresh: refetch,
    highlightUserIds,
    highlightCommentIds,
    highlightedRootIds,
  };
}

/**
 * Formatear timestamp
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
