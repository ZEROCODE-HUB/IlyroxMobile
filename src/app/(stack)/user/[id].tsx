import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Profile from "@/components/Profile/Profile";
import { useAuth } from "@/context/AuthContext";

export default function UserProfileScreen() {
  const { id, profileData } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const isMe = user?.id === id;

  // Parsear profileData del feed cache (pre-carga desde feed)
  const initialProfileData = React.useMemo(() => {
    if (!profileData) return null;
    try {
      return typeof profileData === "string"
        ? JSON.parse(profileData)
        : profileData;
    } catch {
      return null;
    }
  }, [profileData]);

  React.useEffect(() => {
    if (isMe) {
      router.replace("/(tabs)/profile");
    }
  }, [isMe, router]);

  if (isMe) return null;

  return (
    <Profile
      userId={id as string}
      initialProfileData={initialProfileData}
      onBack={() => router.back()}
    />
  );
}
