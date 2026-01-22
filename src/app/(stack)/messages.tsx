import React from "react";
import { useRouter } from "expo-router";
import { useRoute } from "@react-navigation/native";
import MessagingScreen from "../../components/MessagingScreen";

export default function MessagesRoute() {
  const router = useRouter();
  const route = useRoute();

  // Extract params from React Navigation route to preserve objects
  const params = (route.params as any) || {};

  // If initialUser is a string (e.g. from router.push), parse it
  let initialUser = params.initialUser;
  if (typeof initialUser === "string") {
    try {
      initialUser = JSON.parse(initialUser);
    } catch (e) {
      console.error("Error parsing initialUser:", e);
    }
  }

  const isAppointment = params.isAppointment === "true";

  return (
    <>
      <MessagingScreen
        initialUser={initialUser}
        initialPropertyId={params.initialPropertyId}
        conversationId={params.conversationId}
        isAppointment={isAppointment}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.push("/(tabs)");
          }
        }}
      />
    </>
  );
}
