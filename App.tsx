import "react-native-reanimated";
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  NavigationContainer,
  createNavigationContainerRef,
} from "@react-navigation/native";

import BottomTabNavigator, {
  RootTabParamList,
} from "./navigation/BottomTabNavigator";
import { User as UserType } from "./types";
import { useApp } from "./context/AppContext";
import AuthScreen from "./screens/auth/AuthScreen";
import PendingApprovalScreen from "./screens/PendingApprovalScreen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocationSearchBar } from "./components/LocationSearchBar";
import { COLORS } from "./constants";
import { SafeInsetsProvider } from "./context/SafeInsetsContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { OneSignal } from "react-native-onesignal";

export const navigationRef = createNavigationContainerRef<RootTabParamList>();
const queryClient = new QueryClient();

OneSignal.initialize("a727fcbb-320c-4028-bd6b-a2ec90ed2141");
OneSignal.Notifications.requestPermission(true);

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <SafeInsetsProvider>
          <BottomSheetModalProvider>
            <QueryClientProvider client={queryClient}>
              <AppContent />
            </QueryClientProvider>
          </BottomSheetModalProvider>
        </SafeInsetsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppContent() {
  const { currentUser, isLoading, setSelectedLocation } = useApp();
  const insets = useSafeAreaInsets();

  // Alturas dinámicas basadas en insets
  const HEADER_HEIGHT = 70;
  const SEARCH_BAR_HEIGHT = 60;
  const TOTAL_HEADER_HEIGHT = HEADER_HEIGHT + SEARCH_BAR_HEIGHT + insets.top;

  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const isHeaderVisible = useRef(true);
  const lastScrollY = useRef(0);

  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>(
    "Feed",
  );

  // Asegurar que el StatusBar se mantenga visible siempre
  useEffect(() => {
    StatusBar.setHidden(false);
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor(COLORS.primary);
      StatusBar.setTranslucent(false);
    }
    StatusBar.setBarStyle("light-content");
  }, []);

  // Restaurar StatusBar cuando cambia la ruta (por si el picker lo alteró)
  useEffect(() => {
    StatusBar.setHidden(false);
    if (Platform.OS === "android") {
      StatusBar.setTranslucent(false);
    }
  }, [currentRouteName]);

  useEffect(() => {
    if (currentUser) {
      resetHeader();
    }
  }, [currentUser?.id]);

  const resetHeader = () => {
    Animated.spring(headerTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
    isHeaderVisible.current = true;
    lastScrollY.current = 0;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!currentUser) return <AuthScreen />;

  // Verificación de seguridad
  const isAdmin = currentUser.role === "Admin";
  if (
    !isAdmin &&
    (currentUser.aprobaciones_recibidas || 0) <
      (currentUser.aprobaciones_requeridas || 3)
  ) {
    return <PendingApprovalScreen />;
  }

  const handleFeedScroll = (currentScrollY: number) => {
    if (currentRouteName !== "Feed") return;

    // Umbral de seguridad para no ocultar en el tope
    if (currentScrollY < 50) {
      if (!isHeaderVisible.current) resetHeader();
      return;
    }

    const diff = currentScrollY - lastScrollY.current;

    if (diff > 15 && isHeaderVisible.current) {
      // Ocultar (Solo la parte del header, mantenemos insets si es necesario)
      Animated.timing(headerTranslateY, {
        toValue: -TOTAL_HEADER_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
      isHeaderVisible.current = false;
    } else if (diff < -15 && !isHeaderVisible.current) {
      // Mostrar
      resetHeader();
    }
    lastScrollY.current = currentScrollY;
  };

  const isFeed = currentRouteName === "Feed";

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
        translucent={false}
        hidden={false}
      />

      {/* HEADER */}
      {isFeed && (
        <Animated.View
          style={[
            styles.headerContainer,
            {
              height: TOTAL_HEADER_HEIGHT,
              paddingTop: insets.top,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <Image
              source={require("./assets/Logo.jpeg")}
              style={styles.headerLogo}
              resizeMode="cover"
            />
            <View style={styles.headerIcons}>
              {["Matches", "Messages", "Appointments"].map((screen, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => navigationRef.navigate(screen as any)}
                  style={styles.iconButton}
                >
                  <Ionicons
                    name={
                      screen === "Matches"
                        ? "git-compare-outline"
                        : screen === "Messages"
                          ? "chatbubble"
                          : "calendar"
                    }
                    size={22}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.searchWrapper}>
            <LocationSearchBar
              onLocationSelect={(loc) => {
                setSelectedLocation(loc);
                if (loc) navigationRef.navigate("Map");
              }}
              // Ya no necesita topOffset dinámico porque el wrapper se mueve
            />
          </View>
        </Animated.View>
      )}

      <NavigationContainer
        ref={navigationRef}
        onStateChange={() => {
          const name = navigationRef.getCurrentRoute()?.name;
          setCurrentRouteName(name);
          if (name === "Feed") resetHeader();
        }}
      >
        <View style={styles.content}>
          <BottomTabNavigator
            onScrollFeed={handleFeedScroll}
            onUserClick={(u) =>
              navigationRef.navigate("UserProfile", { userId: u.id })
            }
          />
        </View>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  headerContainer: {
    position: "absolute", // Mantenemos absolute pero con lógica de padding en el Feed
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    zIndex: 10,
    paddingHorizontal: 16,
    // Sombra para que no se vea plano
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 5 },
    }),
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
    borderBottomEndRadius: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.white,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchWrapper: {
    height: 60,
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
});
