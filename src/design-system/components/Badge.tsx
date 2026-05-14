import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { COLORS } from "@/constants/colors";
import { theme } from "@/design-system/theme";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "purple"
  | "pink";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  solid?: boolean;
}

const TONE_MAP: Record<
  BadgeTone,
  { background: string; backgroundSolid: string; text: string; textSolid: string }
> = {
  neutral: {
    background: COLORS.background,
    backgroundSolid: COLORS.textSecondary,
    text: COLORS.textSecondary,
    textSolid: COLORS.white,
  },
  primary: {
    background: COLORS.primaryTransparent,
    backgroundSolid: COLORS.primary,
    text: COLORS.primaryDark,
    textSolid: COLORS.white,
  },
  success: {
    background: COLORS.successLight,
    backgroundSolid: COLORS.success,
    text: COLORS.successDark,
    textSolid: COLORS.white,
  },
  warning: {
    background: COLORS.warningLight,
    backgroundSolid: COLORS.warning,
    text: COLORS.warningDark,
    textSolid: COLORS.white,
  },
  error: {
    background: COLORS.errorLight,
    backgroundSolid: COLORS.error,
    text: COLORS.errorDark,
    textSolid: COLORS.white,
  },
  info: {
    background: COLORS.infoLight,
    backgroundSolid: COLORS.info,
    text: COLORS.infoDark,
    textSolid: COLORS.white,
  },
  purple: {
    background: COLORS.tagPurpleLight,
    backgroundSolid: COLORS.tagPurple,
    text: COLORS.tagPurple,
    textSolid: COLORS.white,
  },
  pink: {
    background: COLORS.tagPinkLight,
    backgroundSolid: COLORS.tagPink,
    text: COLORS.tagPink,
    textSolid: COLORS.white,
  },
};

const SIZE_MAP: Record<
  BadgeSize,
  { paddingH: number; paddingV: number; fontSize: number; gap: number }
> = {
  sm: {
    paddingH: theme.spacing.sm,
    paddingV: 2,
    fontSize: theme.typography.fontSizes.xs,
    gap: theme.spacing.xs,
  },
  md: {
    paddingH: theme.spacing.md,
    paddingV: theme.spacing.xs,
    fontSize: theme.typography.fontSizes.sm,
    gap: theme.spacing.xs,
  },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  tone = "neutral",
  size = "sm",
  icon,
  style,
  solid = false,
}) => {
  const tones = TONE_MAP[tone];
  const sizes = SIZE_MAP[size];
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: solid ? tones.backgroundSolid : tones.background,
          paddingHorizontal: sizes.paddingH,
          paddingVertical: sizes.paddingV,
          gap: sizes.gap,
        },
        flatStyle,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          {
            fontSize: sizes.fontSize,
            color: solid ? tones.textSolid : tones.text,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: theme.borderRadius.full,
  },
  label: {
    fontWeight: theme.typography.fontWeights.medium,
  },
});
