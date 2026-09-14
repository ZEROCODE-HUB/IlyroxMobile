import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { FeedDetail, PostDetailShimmer } from "@/components";
import { useFeedItem } from "@/hooks";
import { findFeedItemInCache } from "@/utils/feedCacheLookup";
import { logger } from "@/utils/logger";

const log = logger.scoped("[id]");

export default function PostDetailScreen() {
  const { id, item, highlightUserId, highlightUserIds, highlightCommentIds } =
    useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Soporta tanto el singular legacy (`highlightUserId`) como el CSV
  // plural (`highlightUserIds`) que envía el helper de navegación cuando
  // la notificación viene agrupada con varios autores. CSV es robusto
  // ante las diferencias de deserialización de Expo Router.
  const parseCsv = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.flatMap((x) => String(x).split(",")).map((s) => s.trim()).filter(Boolean);
    if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  };
  const pluralList = parseCsv(highlightUserIds);
  const singularList = highlightUserId ? [highlightUserId as string] : [];
  const mergedHighlightUserIds =
    pluralList.length > 0 ? pluralList : singularList;
  const highlightUserIdsFinal =
    mergedHighlightUserIds.length > 0 ? mergedHighlightUserIds : undefined;

  const parsedHighlightCommentIds = typeof highlightCommentIds === "string"
    ? highlightCommentIds.split(",").filter(Boolean)
    : undefined;

  // 1. Try to get item from params (faster if already available)
  let initialItem: any = null;
  if (item) {
    try {
      initialItem = typeof item === "string" ? JSON.parse(item) : item;
    } catch (e) {
      log.error("Error parsing initial item:", e);
    }
  }

  // 2. Buscar en React Query cache del feed (patrón RTK Query - cache lookup)
  const cachedPost = !initialItem ? findFeedItemInCache(id as string, user?.id) : null;

  // 3. Fetch only if no cached item and no param item
  const { item: fetchedItem, loading } = useFeedItem(
    initialItem || cachedPost ? "" : (id as string),
  );

  const postItem = initialItem || cachedPost || fetchedItem;

  if (loading && !postItem) {
    return <PostDetailShimmer />;
  }

  if (!postItem) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No se encontró la publicación</Text>
      </View>
    );
  }

  return (
    <FeedDetail
      item={postItem}
      currentUserId={user?.id}
      highlightUserIds={highlightUserIdsFinal}
      highlightCommentIds={parsedHighlightCommentIds}
      autoOpenComments={!!highlightUserId || !!highlightUserIds}
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)/profile");
        }
      }}
      onUserClick={(user) => {
        const profileData = {
          id: user.id,
          nombre: user.nombre || user.name || "",
          foto: user.avatar,
          rol: user.role,
          ocupacion: user.ocupacion,
          rating: user.rating,
          totalRatings: user.totalRatings,
        };
        router.push({
          pathname: "/(stack)/user/[id]",
          params: { id: user.id, profileData: JSON.stringify(profileData) },
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
});
