import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { COLORS } from "@/constants/colors";
import { theme } from "@/design-system/theme";

export interface StatItemProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
  layout?: "row" | "column";
  variant?: "card" | "plain";
  style?: ViewStyle | ViewStyle[];
}

export const StatItem: React.FC<StatItemProps> = ({
  icon,
  label,
  value,
  layout = "row",
  variant = "card",
  style,
}) => {
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;

  return (
    <View
      style={[
        styles.base,
        layout === "row" ? styles.row : styles.column,
        variant === "card" ? styles.card : null,
        flatStyle,
      ]}
    >
      {icon && <View style={styles.iconSlot}>{icon}</View>}
      <View style={layout === "row" ? styles.textFlex : undefined}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    gap: theme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  column: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  card: {
    padding: theme.spacing.sm + 2,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },
  iconSlot: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: COLORS.gradientBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  textFlex: {
    flex: 1,
  },
  value: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: theme.typography.fontSizes.xs,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    fontWeight: theme.typography.fontWeights.semibold,
    marginTop: 2,
  },
});
