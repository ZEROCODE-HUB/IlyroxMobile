import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useStableSafeInsets } from "../../context/SafeInsetsContext";

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
  const Tab = createBottomTabNavigator();
  const { top } = useStableSafeInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: top, height: 60 + top },
      ]}
    >
      {isOwnProfile ? (
        <>
          <View style={styles.iconButton} />
          <Text style={styles.title}>Mi Perfil</Text>
          <TouchableOpacity
            onPress={onSettings}
            style={styles.iconButton}
            accessibilityLabel="Configuración"
            accessibilityRole="button"
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.iconButton}
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
          <View style={styles.spacer} />
          <View style={styles.iconButton} />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    flex: 1,
  },
});
