import { useQuery } from "@tanstack/react-query";
import { feedService } from "@/services/feedService";
import { useAuth } from "@/context/AuthContext";
import { FeedItem } from "@/types";

export function useMapFeedItems(propertyIds: string[]) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const stableKey = [...propertyIds].sort().join(",");
  return useQuery<FeedItem[]>({
    queryKey: ["mapFeedItems", stableKey, currentUserId ?? "anon"],
    queryFn: () =>
      feedService.getPropertiesAsFeedItems(propertyIds, currentUserId),
    enabled: propertyIds.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}
