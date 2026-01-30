import React from "react";
import { useRouter } from "expo-router";
import CreatePost from "../../components/CreateContent/CreatePost";

export default function CreatePostScreen() {
  const router = useRouter();
  return <CreatePost onBack={() => router.back()} />;
}
