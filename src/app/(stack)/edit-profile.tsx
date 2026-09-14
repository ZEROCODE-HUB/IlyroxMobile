import { Stack } from "expo-router";
import EditProfile from "@/components/Profile/EditProfile";

export default function EditProfileRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EditProfile />
    </>
  );
}
