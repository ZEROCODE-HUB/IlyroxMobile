import { useState, useEffect, useCallback } from "react";
import { PAGINATION } from "@/constants";
import { reelService, ContextualReelRow } from "@/services/reelService";
import { FeedItem } from "../../types";

const mapContextualReelToFeedItem = (
  r: ContextualReelRow,
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
  const [initialScrollIndex, setInitialScrollIndex] = useState(0);
  const limit = PAGINATION.REEL_CONTEXT_LIMIT;

  const fetchInitialReels = useCallback(async () => {
    setLoading(true);
    const data = await reelService.getContextualFeed(initialReelId, limit);

    if (data.length > 0) {
      const mapped = data.map(mapContextualReelToFeedItem);
      const idx = mapped.findIndex((r) => r.tipo_match === "actual");
      setInitialScrollIndex(idx !== -1 ? idx : 0);
      setReels(mapped);
    }
    setLoading(false);
  }, [initialReelId, limit]);

  const fetchMoreReels = async () => {
    if (isFetchingMore || reels.length === 0) return;

    setIsFetchingMore(true);
    const lastReel = reels[reels.length - 1];

    if (!lastReel || lastReel.likes === undefined) {
      setIsFetchingMore(false);
      return;
    }

    const data = await reelService.getContextualFeed(
      lastReel.reelDetails?.id || lastReel.id,
      limit,
    );

    if (data.length > 0) {
      const posteriors = data
        .filter((r) => r.tipo_match === "posterior")
        .map(mapContextualReelToFeedItem);
      if (posteriors.length > 0) {
        setReels((prev) => {
          const newIds = new Set(posteriors.map((p) => p.id));
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
