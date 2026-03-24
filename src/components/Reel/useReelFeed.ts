import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { FeedItem } from "../../types";

const mapContextualReelToFeedItem = (
  r: any,
): FeedItem & { tipo_match: string } => ({
  id: r.feed_item_id,
  type: "reel",
  content: r.descripcion || "",
  timestamp: new Date().toISOString(),
  images: r.thumbnail_url && r.thumbnail_url !== "" ? [r.thumbnail_url] : [],
  videoUrl: r.video_url || "",
  likes: r.likes_count || 0,
  comments: r.comentarios_count || 0,
  user: {
    id: r.autor_id,
    name: r.autor_nombre || "Usuario",
    avatar: r.autor_foto && r.autor_foto !== "" ? r.autor_foto : undefined,
  } as any,
  reelDetails: {
    id: r.reel_id,
  } as any,
  tipo_match: r.tipo_match,
});

export const useReelFeed = (initialReelId: string, initialItem?: any) => {
  const [reels, setReels] = useState<any[]>(
    initialItem ? [{ ...initialItem, tipo_match: "actual" }] : [],
  );
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  // ✅ Track the index of the "actual" reel so ReelFeedList can scroll to it immediately
  const [initialScrollIndex, setInitialScrollIndex] = useState(0);
  const limit = 5;

  const fetchInitialReels = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_reels_feed_contextual", {
      p_target_reel_id: initialReelId,
      p_limit_around: limit,
    });

    if (!error && data) {
      const mapped = data.map(mapContextualReelToFeedItem);
      // ✅ Calculate the index here, right when data arrives, before setting state
      const idx = mapped.findIndex((r: any) => r.tipo_match === "actual");
      setInitialScrollIndex(idx !== -1 ? idx : 0);
      setReels(mapped);
    }
    setLoading(false);
  }, [initialReelId]);

  const fetchMoreReels = async () => {
    if (isFetchingMore || reels.length === 0) return;

    setIsFetchingMore(true);
    const lastReel = reels[reels.length - 1];

    if (!lastReel || lastReel.likes === undefined) {
      setIsFetchingMore(false);
      return;
    }

    const { data, error } = await supabase.rpc("get_reels_feed_contextual", {
      p_target_reel_id: lastReel.reelDetails?.id || lastReel.id,
      p_limit_around: limit,
    });

    if (data && !error) {
      const posteriors = data
        .filter((r: any) => r.tipo_match === "posterior")
        .map(mapContextualReelToFeedItem);
      if (posteriors.length > 0) {
        setReels((prev) => {
          const newIds = new Set(posteriors.map((p: any) => p.id));
          const prevWithoutNewIds = prev.filter((p) => !newIds.has(p.id));
          return [...prevWithoutNewIds, ...posteriors];
        });
      }
    }
    setIsFetchingMore(false);
  };

  useEffect(() => {
    if (initialReelId) {
      fetchInitialReels();
    }
  }, [fetchInitialReels, initialReelId]);

  return { reels, loading, fetchMoreReels, isFetchingMore, initialScrollIndex };
};
