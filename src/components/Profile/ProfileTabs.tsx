/**
 * ProfileTabs.tsx
 * Tabs para filtrar entre Propiedades, Posts y Reels
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { ProfileContentType } from "../../types";

interface ProfileTabsProps {
  activeTab: ProfileContentType;
  onTabChange: (tab: ProfileContentType) => void;
  counts: {
    properties: number;
    posts: number;
    reels: number;
  };
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
}) => {
  const tabs: { key: ProfileContentType; label: string; icon: keyof typeof Ionicons.glyphMap; count: number }[] = [
    { key: "properties", label: "Propiedades", icon: "home-outline", count: counts.properties },
    { key: "posts", label: "Posts", icon: "grid-outline", count: counts.posts },
    { key: "reels", label: "Reels", icon: "play-circle-outline", count: counts.reels },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={isActive ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            <View style={[styles.badge, isActive && styles.badgeActive]}>
              <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  badge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  badgeActive: {
    backgroundColor: COLORS.primaryTransparent,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  badgeTextActive: {
    color: COLORS.primary,
  },
});

export default ProfileTabs;