/**
 * useComments.ts
 * Hook para manejar comentarios con Optimistic Updates
 *
 * FEATURES:
 * - Comentarios con Optimistic Updates (aparecen instantáneamente)
 * - Upload de imágenes a Supabase Storage
 * - Respuestas anidadas
 * - Rollback automático en errores
 * - Estado compartido con React Query
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Comment } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useImageUpload } from "./useImageUpload";

type PerfilData = {
  id: string;
  nombre: string;
  foto: string | null;
};

// Función auxiliar para leer archivo como Base64 (Eliminada)

interface UseCommentsOptions {
  feedItemId: string;
  userId?: string;
  userProfile?: {
    id: string;
    nombre: string;
    foto: string | null;
  };
}

export function useComments({
  feedItemId,
  userId,
  userProfile,
}: UseCommentsOptions) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["comments", feedItemId];
  const { uploadImage } = useImageUpload();

  /**
   * Fetch comentarios
   */
  const fetchComments = async (): Promise<Comment[]> => {
    const { data, error } = await supabase
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
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return (data || []).map((c) => {
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
        imageUrl: c.imagenes?.[0],
        parentId: c.parent_comentario_id,
        isLiked: c.likes_comentarios?.some((l: any) => l.usuario_id === userId),
      };
    });
  };

  /**
   * Query
   */
  const {
    data: comments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: fetchComments,
    staleTime: 30000,
  });

  /**
   * Mutation: Agregar comentario con Optimistic Update
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

      // 1. Subir imagen si existe
      let imageUrl: string | null = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri, "feed-images", "comments");
        if (!imageUrl) throw new Error("Error subiendo imagen");
      }

      // 2. Determinar nivel de anidación
      let nivelAnidacion = 0;
      if (parentCommentId) {
        const { data: parentData } = await supabase
          .from("comentarios")
          .select("nivel_anidacion")
          .eq("id", parentCommentId)
          .maybeSingle();

        nivelAnidacion = (parentData?.nivel_anidacion || 0) + 1;
      }

      // 3. Insertar comentario
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

    // Optimistic Update
    onMutate: async ({ text, imageUri, parentCommentId }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousComments = queryClient.getQueryData<Comment[]>(queryKey);

      // Crear comentario temporal con ID único
      const tempComment: Comment = {
        id: `temp_${Date.now()}`,
        user: {
          id: userProfile?.id || userId || "",
          nombre: userProfile?.nombre || "Tú",
          name: userProfile?.nombre || "Tú",
          avatar: userProfile?.foto || undefined,
          isFollowing: false,
          role: "User" as const,
        },
        text: text?.trim() || "",
        timestamp: "Enviando...", // ⬅️ Indicador visual
        imageUrl: imageUri, // Mostrar imagen local temporalmente
        parentId: parentCommentId,
        isLiked: false,
      };

      // Agregar a la lista optimísticamente
      queryClient.setQueryData(queryKey, (old: Comment[] = []) => [
        ...old,
        tempComment,
      ]);

      const commentCountKey = ["commentCount", feedItemId];
      await queryClient.cancelQueries({ queryKey: commentCountKey });
      const previousCount = queryClient.getQueryData<number>(commentCountKey);

      // Actualizar contador optimísticamente
      queryClient.setQueryData(commentCountKey, (old: number | undefined) => {
        return (old ?? 0) + 1;
      });

      return { previousComments, tempComment, previousCount };
    },

    onSuccess: (data, variables, context) => {
      // Reemplazar comentario temporal con el real
      queryClient.setQueryData(queryKey, (old: Comment[] = []) => {
        const filtered = old.filter((c) => c.id !== context.tempComment.id);

        const perfil = Array.isArray(data.perfiles)
          ? data.perfiles[0]
          : data.perfiles;
        const realComment: Comment = {
          id: data.id,
          user: {
            id: (perfil as PerfilData)?.id || "",
            nombre: (perfil as PerfilData)?.nombre || "Usuario",
            name: (perfil as PerfilData)?.nombre || "Usuario",
            avatar: (perfil as PerfilData)?.foto || undefined,
            isFollowing: false,
            role: "User" as const,
          },
          text: data.contenido || "",
          timestamp: "Ahora",
          imageUrl: data.imagenes?.[0],
          parentId: data.parent_comentario_id,
          isLiked: false,
        };

        return [...filtered, realComment];
      });

      //showToast('Comentario publicado', 'success');
    },

    onError: (err, variables, context: any) => {
      // Rollback: Remover comentario temporal
      queryClient.setQueryData(queryKey, context.previousComments);

      // Rollback: Contador
      const commentCountKey = ["commentCount", feedItemId];
      queryClient.setQueryData(commentCountKey, context.previousCount);

      console.error("Error adding comment:", err);
      showToast("Error de conexión", "error");
    },
    retry: (failureCount, error: any) => {
      // No reintentar errores de autenticación o lógica (400s)
      if (
        error?.message === "No auth" ||
        error?.status === 400 ||
        error?.status === 403 ||
        error?.status === 401
      ) {
        return false;
      }
      return failureCount < 2; // Máximo 3 intentos total
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  /**
   * Agregar comentario (función helper)
   */
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
   * Toggle like en comentario con Optimistic Update
   */
  const toggleCommentLikeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!userId) throw new Error("No auth");

      // Verificar si ya dio like
      const { data: existing } = await supabase
        .from("likes_comentarios")
        .select("id")
        .eq("comentario_id", commentId)
        .eq("usuario_id", userId)
        .maybeSingle();

      if (existing) {
        // Quitar like
        await supabase
          .from("likes_comentarios")
          .delete()
          .eq("comentario_id", commentId)
          .eq("usuario_id", userId);

        return { action: "unlike" as const };
      } else {
        // Agregar like
        await supabase.from("likes_comentarios").insert({
          comentario_id: commentId,
          usuario_id: userId,
        });

        return { action: "like" as const };
      }
    },
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousComments = queryClient.getQueryData<Comment[]>(queryKey);

      if (previousComments) {
        queryClient.setQueryData<Comment[]>(
          queryKey,
          previousComments.map((c) =>
            c.id === commentId ? { ...c, isLiked: !c.isLiked } : c,
          ),
        );
      }

      return { previousComments };
    },
    onError: (err, commentId, context: any) => {
      if (context?.previousComments) {
        queryClient.setQueryData(queryKey, context.previousComments);
      }
      showToast("Error al procesar el like", "error");
    },
    onSettled: () => {
      // Opcional: refetch para asegurar sincronización, pero el optimistic ya lo hace visual
      // queryClient.invalidateQueries({ queryKey });
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
      console.error("Error toggling comment like:", error);
      showToast("Error al dar like", "error");
      return false;
    }
  };

  return {
    comments,
    loading: isLoading,
    posting: addCommentMutation.isPending,
    error: null,
    addComment,
    toggleCommentLike,
    refresh: refetch,
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
