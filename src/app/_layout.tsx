import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OneSignal } from "react-native-onesignal";
import { useEffect } from "react";
import {
  Platform,
  StatusBar,
  LogBox,
} from "react-native";

import { AppProvider } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

import { ModalProvider } from "@/context/ModalContext";
import { SafeInsetsProvider } from "@/context/SafeInsetsContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import PendingApprovalScreen from "@/screens/PendingApprovalScreen";
import { InitialLoading } from "@/components/common/InitialLoading";
import { useVersionCheck } from "@/hooks/useVersionCheck";
import { VersionUpdateModal } from "@/components/modals/VersionUpdateModal";

// Ignore common warnings that do not affect functionality
LogBox.ignoreLogs([
  "Support for defaultProps will be removed",
  "MemoizedTNodeRenderer",
  "TNodeChildrenRenderer",
  "TRenderEngineProvider",
]);

// OneSignal init
if (Platform.OS !== "web") {
  OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!);
  OneSignal.Notifications.requestPermission(true);
}

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <AppProvider>
            <ToastProvider>
              <SafeAreaProvider>
                <ModalProvider>
                  <SafeInsetsProvider>
                    <BottomSheetModalProvider>
                      <QueryClientProvider client={queryClient}>
                        <RootLayoutNav />
                      </QueryClientProvider>
                    </BottomSheetModalProvider>
                  </SafeInsetsProvider>
                </ModalProvider>
              </SafeAreaProvider>
            </ToastProvider>
          </AppProvider>
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { session, profile, loading: authLoading } = useAuth();
  const {
    updateRequired,
    versionInfo,
    loading: versionLoading,
  } = useVersionCheck();
  const segments = useSegments();
  const router = useRouter();

  const loading = authLoading || versionLoading;

  // Handler de tap en notificaciones push
  useEffect(() => {
    if (Platform.OS === "web") return;
    const handleNotificationClick = (event: any) => {
      const data = event?.notification?.additionalData;
      if (!data?.type) return;
      if (data.type === "new_match") {
        router.push("/(stack)/matches");
      } else if (data.type === "recordar_filtros") {
        router.push("/(stack)/map");
      }
    };
    OneSignal.Notifications.addEventListener("click", handleNotificationClick);
    return () => {
      OneSignal.Notifications.removeEventListener("click", handleNotificationClick);
    };
  }, [router]);

  // Global StatusBar setup
  useEffect(() => {
    StatusBar.setHidden(false);
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("transparent");
      StatusBar.setTranslucent(true);
      StatusBar.setBarStyle("dark-content"); // Default to dark content for light theme
    } else {
      StatusBar.setBarStyle("dark-content");
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    const isResetPassword = segments.includes("reset-password");

    if (!session && !inAuthGroup) {
      router.replace("/login");
    } else if (session && inAuthGroup && !isResetPassword) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  if (loading) {
    return <InitialLoading />;
  }

  // Si hay sesión pero el perfil aún no carga, seguimos en loading
  if (session && !profile) {
    return <InitialLoading />;
  }

  // Verificación de aprobaciones para no-admins
  if (session && profile) {
    const isAdmin = profile.rol === "admin";
    if (
      !isAdmin &&
      (profile.aprobaciones_recibidas || 0) <
        (profile.aprobaciones_requeridas || 3)
    ) {
      return <PendingApprovalScreen />;
    }
  }

  // Main Stack incorporating all groups
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(stack)" />
      </Stack>
      {updateRequired && versionInfo && (
        <VersionUpdateModal
          visible={updateRequired}
          storeUrl={versionInfo.store_url}
        />
      )}
    </>
  );
}

