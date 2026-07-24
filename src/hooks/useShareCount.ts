import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface UseShareCountOptions {
  feedItemId: string;
  initialCount: number;
}

/**
 * useShareCount
 * Espejo de useCommentCount: lee el contador de compartidos desde
 * feed_items.compartidos_count con React Query (resync automático y
 * compatible con React.memo). Expone un incremento optimista para
 * reflejar de inmediato un nuevo compartido tras llamar a la RPC.
 */
export function useShareCount({
  feedItemId,
  initialCount,
}: UseShareCountOptions) {
  const queryClient = useQueryClient();
  const queryKey = ["shareCount", feedItemId];

  const fetchShareCount = async () => {
    const { data, error } = await supabase
      .from("feed_items")
      .select("compartidos_count")
      .eq("id", feedItemId)
      .maybeSingle();

    if (error) throw error;
    return data?.compartidos_count ?? initialCount;
  };

  const { data: count } = useQuery({
    queryKey,
    queryFn: fetchShareCount,
    initialData: initialCount,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Incremento optimista local + revalidación diferida (la RPC ya corrió en BD)
  const incrementShareCount = () => {
    queryClient.setQueryData<number>(queryKey, (old) => (old ?? initialCount) + 1);
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey });
    }, 600);
  };

  return {
    count,
    incrementShareCount,
  };
}
