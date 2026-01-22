import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import ReelDetail from "@/components/Reel/ReelDetail";
import { useAuth } from "@/context/AuthContext";

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
      console.error("Error parsing reel item:", e);
    }
  }

  if (!reelItem) {
    return null;
  }

  return (
    <ReelDetail
      item={reelItem}
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
