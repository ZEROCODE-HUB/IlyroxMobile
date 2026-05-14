import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface UseCommentCountOptions {
  feedItemId: string;
  initialCount: number;
}

export function useCommentCount({
  feedItemId,
  initialCount,
}: UseCommentCountOptions) {
  const queryKey = ["commentCount", feedItemId];

  const fetchCommentCount = async () => {
    const { data, error } = await supabase
      .from("feed_items")
      .select("comentarios_count")
      .eq("id", feedItemId)
      .maybeSingle();

    if (error) throw error;
    return data?.comentarios_count ?? initialCount;
  };

  const { data: count } = useQuery({
    queryKey,
    queryFn: fetchCommentCount,
    initialData: initialCount,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    count,
  };
}
