import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { useStableSafeInsets } from "../context/SafeInsetsContext";
import SafePressable from "@/design-system/components/SafePressable";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  rightComponent?: React.ReactNode;
  /**
   * Si el padre ya aplica la safe area top, pasar 0 para que AppHeader
   * no duplique el inset. Si no se pasa, usa el `top` de useStableSafeInsets.
   */
  topInset?: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBackButton = false,
  rightComponent,
  topInset,
}) => {
  const { top } = useStableSafeInsets();
  const effectiveTopInset = topInset ?? top;

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: effectiveTopInset + 12,
        },
      ]}
    >
      <View style={styles.headerTop}>
        {showBackButton && onBack ? (
          <SafePressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <Ionicons
              name="chevron-back-outline"
              size={24}
              color={COLORS.textPrimary}
            />
          </SafePressable>
        ) : (
          <View style={styles.backButton} />
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>

        {rightComponent ? (
          <View style={styles.rightContainer}>{rightComponent}</View>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      {subtitle && <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>}
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
    minWidth: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
