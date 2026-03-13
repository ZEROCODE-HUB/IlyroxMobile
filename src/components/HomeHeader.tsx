import React from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LocationSearchBar } from "./LocationSearchBar";
import { COLORS } from "../constants";
import { useApp } from "../context/AppContext";

// Assuming Logo is in assets folder relative to src/components -> ../../assets/Logo.jpeg
// Adjust path if necessary based on project structure.
// User's App.tsx had require("./assets/Logo.jpeg") from root.
const LOGO_SOURCE = require("../assets/Logo.jpeg");

interface HomeHeaderProps {
  style?: any;
  onSearchingChange?: (val: boolean) => void;
  isHeaderVisible?: boolean;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  style,
  onSearchingChange,
  isHeaderVisible = true,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setSelectedLocation } = useApp();

  const handleNavigation = (screen: string) => {
    switch (screen) {
      case "Matches":
        router.push("/(stack)/matches");
        break;
      case "Messages":
        router.push("/(stack)/messages");
        break;
      case "Appointments":
        router.push("/(stack)/appointments");
        break;
      case "Requests":
        router.push("/(stack)/requests");
        break;
      default:
        break;
    }
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.headerContainer, { paddingTop: insets.top }, style]}
    >
      {/* Background fill - this covers only the header part */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: COLORS.primary,
            height: 130 + insets.top, // Fixed height for background
            zIndex: -1,
          },
        ]}
      />

      <View style={styles.headerTopRow}>
        <Image
          source={LOGO_SOURCE}
          style={styles.headerLogo}
          resizeMode="cover"
        />
        <View style={styles.headerIcons}>
          {["Matches", "Messages", "Requests", "Appointments"].map(
            (screen, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleNavigation(screen)}
                style={styles.iconButton}
              >
                <Ionicons
                  name={
                    screen === "Matches"
                      ? "git-compare-outline"
                      : screen === "Messages"
                        ? "chatbubble-outline"
                        : screen === "Requests"
                          ? "reader-outline"
                          : screen === "Appointments"
                            ? "calendar-outline"
                            : "calendar-outline"
                  }
                  size={22}
                  color={COLORS.white}
                />
              </TouchableOpacity>
            ),
          )}
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <LocationSearchBar
          onLocationSelect={(loc) => {
            setSelectedLocation({
              type: loc.type,
              name: loc.name,
              estado_id: loc.estado_id,
            });
            if (loc) router.push("/(stack)/map");
          }}
          onSearchingChange={onSearchingChange}
          isHeaderVisible={isHeaderVisible}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: COLORS.primary,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 10, // Added some bottom padding
    // Shadows
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
    justifyContent: "center",
    zIndex: 100,
  },
});
