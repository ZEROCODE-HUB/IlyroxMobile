import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import ReelFeedList from "@/components/Reel/ReelFeedList";
import { useAuth } from "@/context/AuthContext";
import { useFeedItem } from "@/hooks";
import { logger } from "@/utils/logger";

const log = logger.scoped("[id]");

export default function ReelDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Handle 'item' parameter which might be a JSON string
  let reelItem: any = null;
  if (params.item) {
    try {
      reelItem =
        typeof params.item === "string" ? JSON.parse(params.item) : params.item;
    } catch (e) {
      log.error("Error parsing reel item:", e);
    }
  }

  // Use hook to fetch if not provided via state
  const {
    item: fetchedItem,
    loading,
    error,
  } = useFeedItem(!reelItem ? (params.id as string) : "");

  // Priority to fetched item if it was requested, or the passed item
  const finalItem = reelItem || fetchedItem;

  if (loading && !reelItem) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!finalItem) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff" }}>
          {error ? "Error al cargar" : "Reel no encontrado"}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: "#fff", textDecorationLine: "underline" }}>
            Volver
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <ReelFeedList
      initialReelItem={reelItem}
      initialReelId={
        finalItem.reelDetails?.id ||
        (finalItem.type === "reel" ? finalItem.id : finalItem.id)
      }
      currentUserId={user?.id}
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)/profile");
        }
      }}
      onUserClick={(user) => {
        router.push({
          pathname: "/(stack)/user/[id]",
          params: { id: user.id },
        });
      }}
    />
  );
}
