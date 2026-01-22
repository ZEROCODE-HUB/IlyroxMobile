import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OneSignal } from "react-native-onesignal";
import { useEffect } from "react";
import {
  Platform,
  StatusBar,
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { COLORS } from "../constants";

import { AppProvider, useApp } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { SafeInsetsProvider } from "@/context/SafeInsetsContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthScreen from "@/screens/auth/AuthScreen";
import PendingApprovalScreen from "@/screens/PendingApprovalScreen";

// OneSignal init
OneSignal.initialize("a727fcbb-320c-4028-bd6b-a2ec90ed2141");
OneSignal.Notifications.requestPermission(true);

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <AppProvider>
            <ToastProvider>
              <SafeAreaProvider>
                <SafeInsetsProvider>
                  <BottomSheetModalProvider>
                    <QueryClientProvider client={queryClient}>
                      <RootLayoutNav />
                    </QueryClientProvider>
                  </BottomSheetModalProvider>
                </SafeInsetsProvider>
              </SafeAreaProvider>
            </ToastProvider>
          </AppProvider>
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { currentUser, isLoading } = useApp();

  // Global StatusBar setup
  useEffect(() => {
    StatusBar.setHidden(false);
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(COLORS.primary);
      StatusBar.setTranslucent(false);
    }
    StatusBar.setBarStyle("dark-content");
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!currentUser) {
    return <AuthScreen />;
  }

  const isAdmin = currentUser.role === "Admin";
  if (
    !isAdmin &&
    (currentUser.aprobaciones_recibidas || 0) <
      (currentUser.aprobaciones_requeridas || 3)
  ) {
    return <PendingApprovalScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(stack)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
});
