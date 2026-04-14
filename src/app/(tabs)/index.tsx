import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Feed from "../../components/Feed/Feed";
import { useAuth } from "../../context/AuthContext";
import { HomeHeader } from "../../components/HomeHeader";
import { User } from "../../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Dimensions } from "react-native";
import MapSearch from "../../components/map/MapSearch";
import { useApp } from "../../context/AppContext";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

export default function FeedScreen() {
  const router = useRouter();
  const { refresh } = useLocalSearchParams();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { properties, saveSearch } = useApp();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [headerShown, setHeaderShown] = useState(true);
  const [isMapOpening, setIsMapOpening] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

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

  const handleOpenMap = () => {
    setIsMapOpening(true);
  };

  useEffect(() => {
    if (isMapOpening && !isMapReady) {
      const timer = setTimeout(() => {
        setIsMapReady(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isMapOpening]);

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
          onOpenMap={() => setIsMapOpening(true)}
        />
      </Animated.View>

      <Modal
        visible={isMapOpening}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsMapOpening(false)}
      >
        <View style={[styles.modalOverlay, { marginTop: TOTAL_HEADER_HEIGHT }]}>
          <View style={styles.modalContent}>
            {/* Header del Modal con botón cerrar */}
            <View style={styles.modalHeader}>
              <View style={styles.modalIndicator} />
              <TouchableOpacity 
                onPress={() => setIsMapOpening(false)}
                style={styles.closeModalButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {isMapReady ? (
              <MapSearch
                properties={properties}
                onSaveSearch={(name, leadName, leadPhone) =>
                  saveSearch(name, "", leadName, leadPhone)
                }
              />
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#005B52" />
                <Text style={styles.loadingText}>
                  Cargando mapa interactivo...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    overflow: "hidden",
  },
  modalHeader: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
  },
  closeModalButton: {
    position: "absolute",
    right: 16,
    top: 8,
  },
});
