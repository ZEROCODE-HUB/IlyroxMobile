import React, { useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";
import Feed from "../../components/Feed/Feed";
import { useAuth } from "../../context/AuthContext";
import { HomeHeader } from "../../components/HomeHeader";
import { User } from "../../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FeedScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

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
    } else if (diff < -15 && !isHeaderVisible.current) {
      // Show
      resetHeader();
    }
    lastScrollY.current = currentScrollY;
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.headerWrapper,
          {
            height: TOTAL_HEADER_HEIGHT,
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
      >
        <HomeHeader style={{ height: TOTAL_HEADER_HEIGHT }} />
      </Animated.View>

      <Feed
        currentUserId={user?.id}
        currentUserState={profile?.estado || ""}
        onUserClick={handleUserClick}
        onScroll={handleScroll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F8F8",
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
