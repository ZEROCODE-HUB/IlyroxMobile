import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { COLORS } from "@/constants/colors";
import { theme } from "@/design-system/theme";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  level?: 1 | 2 | 3;
  style?: ViewStyle | ViewStyle[];
}

const LEVEL_SIZES: Record<1 | 2 | 3, number> = {
  1: theme.typography.fontSizes.xl,
  2: theme.typography.fontSizes.lg,
  3: theme.typography.fontSizes.md,
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  right,
  level = 2,
  style,
}) => {
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
  return (
    <View style={[styles.container, flatStyle]}>
      <View style={styles.textBlock}>
        <Text style={[styles.title, { fontSize: LEVEL_SIZES[level] }]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right && <View>{right}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontWeight: theme.typography.fontWeights.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
