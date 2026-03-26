import React, { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Profile from "@/components/Profile/Profile";
import { useAuth } from "@/context/AuthContext";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const isMe = user?.id === id;

  useEffect(() => {
    if (isMe) {
      router.replace("/(tabs)/profile");
    }
  }, [isMe]);

  if (isMe) return null;

  return <Profile userId={id as string} onBack={() => router.back()} />;
}
