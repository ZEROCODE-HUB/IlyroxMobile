import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Feed from "../../components/Feed/Feed";
import { useAuth } from "../../context/AuthContext";
import { HomeHeader } from "../../components/HomeHeader";
import { User } from "../../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";
import { COLORS } from "../../constants/colors";
import PushPermissionBanner from "../../components/PushPermissionBanner";

export default function FeedScreen() {
  const router = useRouter();
  const { refresh } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const pendingOpenMap = usePropertyFiltersStore((s) => s.pendingOpenMap);
  const setPendingOpenMap = usePropertyFiltersStore((s) => s.setPendingOpenMap);
  const [isSearching, setIsSearching] = useState(false);
  const [headerShown, setHeaderShown] = useState(true);

  // Animation Refs
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const isHeaderVisible = useRef(true);
  const lastScrollY = useRef(0);

  // Constants
  const HEADER_CONTENT_HEIGHT = 130; // 60 top + 60 search + 10 padding
  const TOTAL_HEADER_HEIGHT = HEADER_CONTENT_HEIGHT + insets.top;

  const handleUserClick = (user: User) => {
    router.push({
      pathname: "/(stack)/user/[id]",
      params: { id: user.id },
    });
  };

  const resetHeader = () => {
    Animated.spring(headerTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
    isHeaderVisible.current = true;
    setHeaderShown(true);
    lastScrollY.current = 0;
  };

  const handleScroll = (currentScrollY: number) => {
    // Threshold calculation
    if (currentScrollY < 50) {
      if (!isHeaderVisible.current) resetHeader();
      lastScrollY.current = currentScrollY;
      return;
    }

    const diff = currentScrollY - lastScrollY.current;

    if (diff > 15 && isHeaderVisible.current) {
      // Hide
      Animated.timing(headerTranslateY, {
        toValue: -TOTAL_HEADER_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
      isHeaderVisible.current = false;
      setHeaderShown(false);
    } else if (diff < -15 && !isHeaderVisible.current) {
      // Show
      resetHeader();
    }
    lastScrollY.current = currentScrollY;
  };

  useEffect(() => {
    if (pendingOpenMap) {
      setPendingOpenMap(false);
      router.push("/(stack)/map");
    }
  }, [pendingOpenMap]);

  // Tras publicar (llega el param `refresh`), mostrar el header aunque estuviera
  // oculto: el scroll programático al top no dispara onScroll, así que el header
  // no se resetea solo.
  const lastRefreshParamRef = useRef<string | null>(null);
  useEffect(() => {
    const r = Array.isArray(refresh) ? refresh[0] : refresh;
    if (r && r !== lastRefreshParamRef.current) {
      lastRefreshParamRef.current = r;
      resetHeader();
    }
  }, [refresh]);

  return (
    <View style={styles.container}>
      <Feed
        currentUserId={user?.id}
        currentUserState={profile?.estado || ""}
        onUserClick={handleUserClick}
        onScroll={handleScroll}
        scrollEnabled={!isSearching}
        refreshTimestamp={refresh ? Number(refresh) : undefined}
      />

      {isSearching && (
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0,0,0,0.1)",
              zIndex: 90,
            },
          ]}
          onPress={() => setIsSearching(false)}
        />
      )}

      {/* Floating Map Button - Only shown if there's a selected location */}

      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.headerWrapper,
          {
            transform: [{ translateY: headerTranslateY }],
            zIndex: 100,
          },
        ]}
      >
        <HomeHeader
          style={{ height: TOTAL_HEADER_HEIGHT }}
          onSearchingChange={setIsSearching}
          isHeaderVisible={headerShown}
          onOpenMap={() => router.push("/(stack)/map")}
        />
      </Animated.View>

      <PushPermissionBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 5,
  },
});
