/**
 * useLikes.ts
 * Hook para manejar likes con Optimistic Updates
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";
import { useEffect } from "react";

interface UseLikesOptions {
  feedItemId: string;
  initialLikes: number;
  userId?: string;
  onLikeSuccess?: () => void;
}

export function useLikes(options: UseLikesOptions) {
  const { feedItemId, initialLikes, userId } = options;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["likes", feedItemId];

  /**
   * Fetch del estado actual
   */
  const fetchLikeState = async () => {
    // 1. Obtener contador real
    const { data: feedData } = await supabase
      .from("feed_items")
      .select("likes_count")
      .eq("id", feedItemId)
      .maybeSingle();

    const likesCount = feedData?.likes_count ?? initialLikes;

    // 2. Verificar si user dio like
    if (!userId) {
      return { isLiked: false, likesCount };
    }

    const { data: likeData } = await supabase
      .from("likes_feed_items")
      .select("id")
      .eq("feed_item_id", feedItemId)
      .eq("usuario_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    return {
      isLiked: !!likeData,
      likesCount,
    };
  };

  /**
   * Query
   */
  const { data, refetch } = useQuery({
    queryKey,
    queryFn: fetchLikeState,
    staleTime: 0, // ⬅️ Siempre refetch
    gcTime: 5 * 60 * 1000, // 5 minutos en caché
  });

  /**
   * Mutation
   */
  const mutation = useMutation({
    mutationFn: async (isCurrentlyLiked: boolean) => {
      if (!userId) throw new Error("No auth");

      if (isCurrentlyLiked) {
        // Quitar like
        await supabase
          .from("likes_feed_items")
          .delete()
          .eq("feed_item_id", feedItemId)
          .eq("usuario_id", userId);
      } else {
        // Agregar like
        const { error } = await supabase.from("likes_feed_items").insert({
          feed_item_id: feedItemId,
          usuario_id: userId,
        });

        // Ignorar duplicados
        if (error && error.code !== "23505") throw error;
      }
    },

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      // Cambiar isLiked Y likesCount optimísticamente
      queryClient.setQueryData(queryKey, (old: any) => ({
        isLiked: !old.isLiked,
        likesCount: !old.isLiked
          ? old.likesCount + 1
          : Math.max(0, old.likesCount - 1),
      }));

      return { previousData };
    },
    onError: (err, variables, context: any) => {
      queryClient.setQueryData(queryKey, context.previousData);
      console.error("Error toggling like:", err);
      showToast("Error al actualizar like", "error");
    },

    onSuccess: async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      refetch();

      // Callback para tracking
      options.onLikeSuccess?.();
    },
  });

  const toggleLike = () => {
    if (!userId) {
      showToast("Debes iniciar sesión para dar like", "warning");
      return;
    }
    mutation.mutate(data?.isLiked ?? false);
  };

  return {
    likes: data?.likesCount ?? initialLikes,
    isLiked: data?.isLiked ?? false,
    toggleLike,
    isLoading: mutation.isPending,
    checkIfLiked: () => {},
  };
}
