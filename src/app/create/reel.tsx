import React from "react";
import { useRouter } from "expo-router";
import CreateReel from "../../components/CreateContent/CreateReel";

export default function CreateReelScreen() {
  const router = useRouter();
  // Ensure that when we go back, we really go back in history
  return <CreateReel onBack={() => router.back()} />;
}
