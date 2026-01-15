import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

interface ProfileHeaderProps {
  isOwnProfile: boolean;
  onBack?: () => void;
  onSettings?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isOwnProfile,
  onBack,
  onSettings,
}) => {
  return (
    <View style={styles.headerInner}>
      <TouchableOpacity
        onPress={isOwnProfile ? undefined : onBack}
        style={styles.iconButton}
        disabled={isOwnProfile && !onBack}
      >
        {!isOwnProfile && (
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        )}
      </TouchableOpacity>

      <Text style={styles.title}>{isOwnProfile ? "Mi Perfil" : ""}</Text>

      <TouchableOpacity
        onPress={onSettings}
        style={styles.iconButton}
        disabled={!isOwnProfile}
      >
        {isOwnProfile && (
          <Ionicons
            name="settings-outline"
            size={24}
            color={COLORS.textPrimary}
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  headerInner: {
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingTop: 16,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    flex: 1,
  },
});
