import React from "react";
import { useRouter } from "expo-router";
import CreateProperty from "../../components/CreateContent/CreateProperty";

export default function CreatePropertyScreen() {
  const router = useRouter();
  return <CreateProperty onBack={() => router.back()} />;
}
