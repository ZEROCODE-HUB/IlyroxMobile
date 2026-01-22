import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { FeedDetail } from "@/components";

export default function PostDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Handle 'item' parameter which might be a JSON string
  let postItem: any = null;
  if (params.item) {
    try {
      postItem =
        typeof params.item === "string" ? JSON.parse(params.item) : params.item;
    } catch (e) {
      console.error("Error parsing post item:", e);
    }
  }

  if (!postItem) {
    return null;
  }
  return (
    <FeedDetail
      item={postItem}
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
