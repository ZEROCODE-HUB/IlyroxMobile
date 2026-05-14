import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { COLORS } from "@/constants/colors";
import { theme } from "@/design-system/theme";

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
  center?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  transparent?: boolean;
  showBorder?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  left,
  right,
  center,
  style,
  transparent = false,
  showBorder = true,
}) => {
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;

  return (
    <View
      style={[
        styles.container,
        transparent
          ? styles.transparent
          : {
              backgroundColor: COLORS.white,
              borderBottomWidth: showBorder ? StyleSheet.hairlineWidth : 0,
              borderBottomColor: COLORS.cardBorder,
            },
        flatStyle,
      ]}
    >
      <View style={styles.side}>
        {left ??
          (onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <ChevronLeft size={24} color={COLORS.textPrimary} />
            </Pressable>
          ) : null)}
      </View>

      <View style={styles.center}>
        {center ??
          (title ? (
            <>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </>
          ) : null)}
      </View>

      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    minHeight: 52,
  },
  transparent: {
    backgroundColor: "transparent",
  },
  side: {
    minWidth: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  sideRight: {
    justifyContent: "flex-end",
  },
  backButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  pressed: {
    opacity: 0.6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.xs,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
});
