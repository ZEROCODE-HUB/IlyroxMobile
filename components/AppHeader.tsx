import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useStableSafeInsets } from "../context/SafeInsetsContext";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  rightComponent?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBackButton = false,
  rightComponent,
}) => {
  const { top } = useStableSafeInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: top,
        },
      ]}
    >
      <View style={styles.headerTop}>
        {showBackButton && onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>

        {rightComponent ? (
          <View style={styles.rightContainer}>{rightComponent}</View>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  rightContainer: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
