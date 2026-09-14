import React from "react";
import { View, Text,  StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/colors";
import { SafePressable } from "@/design-system";

interface ProfileHeaderProps {
  isOwnProfile: boolean;
  onBack?: () => void;
  onSettings?: () => void;
  onSupport?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isOwnProfile,
  onBack,
  onSettings,
  onSupport,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.headerInner, { paddingTop: insets.top +4 }]}>
      <SafePressable
        onPress={isOwnProfile ? undefined : onBack}
        style={styles.iconButton}
        disabled={isOwnProfile && !onBack}
      >
        {!isOwnProfile && (
          <Ionicons
            name="chevron-back-outline"
            size={24}
            color={COLORS.textPrimary}
          />
        )}
      </SafePressable>

      <Text style={styles.title}>{isOwnProfile ? "Mi Perfil" : "Perfil"}</Text>

      <SafePressable
        onPress={onSupport}
        style={styles.iconButton}
        disabled={!isOwnProfile}
      >
        {isOwnProfile && (
          <Ionicons
            name="help-circle-outline"
            size={27}
            color={COLORS.textPrimary}
          />
        )}
      </SafePressable>

      <SafePressable
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
      </SafePressable>
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
