import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import Profile from "../../../components/Profile/Profile";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  return <Profile userId={id as string} onBack={() => router.back()} />;
}
