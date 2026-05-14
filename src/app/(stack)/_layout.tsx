import { Stack } from "expo-router";

export default function StackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="user/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="property/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="messages" options={{ presentation: "card" }} />
      <Stack.Screen name="settings" options={{ presentation: "card" }} />
      <Stack.Screen name="post/[id]" options={{ presentation: "card" }} />
      <Stack.Screen name="reel/[id]" options={{ presentation: "modal" }} />
      <Stack.Screen name="easy-broker" options={{ presentation: "card" }} />
      <Stack.Screen name="map" options={{ presentation: "card" }} />
      <Stack.Screen name="map-results" options={{ presentation: "card" }} />
      <Stack.Screen name="matches" options={{ presentation: "card" }} />
    </Stack>
  );
}
