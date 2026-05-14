import { useQuery } from "@tanstack/react-query";
import { feedService } from "@/services/feedService";
import { FeedItem } from "@/types";

export function useMapFeedItems(propertyIds: string[]) {
  const stableKey = [...propertyIds].sort().join(",");
  return useQuery<FeedItem[]>({
    queryKey: ["mapFeedItems", stableKey],
    queryFn: () => feedService.getPropertiesAsFeedItems(propertyIds),
    enabled: propertyIds.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: [],
  });
}
