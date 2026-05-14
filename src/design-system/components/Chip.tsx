import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { COLORS } from "@/constants/colors";
import { theme } from "@/design-system/theme";

export type ChipTone = "neutral" | "primary" | "outline" | "solid";
export type ChipSize = "sm" | "md";

export interface ChipProps {
  label: string;
  tone?: ChipTone;
  size?: ChipSize;
  icon?: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const SIZE_MAP: Record<
  ChipSize,
  { paddingH: number; paddingV: number; fontSize: number; gap: number }
> = {
  sm: {
    paddingH: theme.spacing.sm,
    paddingV: 4,
    fontSize: theme.typography.fontSizes.xs,
    gap: theme.spacing.xs,
  },
  md: {
    paddingH: theme.spacing.md,
    paddingV: theme.spacing.sm,
    fontSize: theme.typography.fontSizes.sm,
    gap: theme.spacing.xs,
  },
};

function getToneStyles(tone: ChipTone, selected: boolean) {
  if (selected) {
    return {
      container: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
        borderWidth: 1,
      },
      text: { color: COLORS.white },
    };
  }
  switch (tone) {
    case "primary":
      return {
        container: {
          backgroundColor: COLORS.primaryTransparent,
          borderWidth: 0,
        },
        text: { color: COLORS.primaryDark },
      };
    case "solid":
      return {
        container: {
          backgroundColor: COLORS.primary,
          borderWidth: 0,
        },
        text: { color: COLORS.white },
      };
    case "outline":
      return {
        container: {
          backgroundColor: COLORS.white,
          borderWidth: 1,
          borderColor: COLORS.primaryLight,
        },
        text: { color: COLORS.primaryDark },
      };
    case "neutral":
    default:
      return {
        container: {
          backgroundColor: COLORS.background,
          borderWidth: 0,
        },
        text: { color: COLORS.textSecondary },
      };
  }
}

export const Chip: React.FC<ChipProps> = ({
  label,
  tone = "neutral",
  size = "md",
  icon,
  onPress,
  selected = false,
  style,
}) => {
  const sizes = SIZE_MAP[size];
  const toneStyles = getToneStyles(tone, selected);
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;

  const content = (
    <View
      style={[
        styles.base,
        {
          paddingHorizontal: sizes.paddingH,
          paddingVertical: sizes.paddingV,
          gap: sizes.gap,
        },
        toneStyles.container,
        flatStyle,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          { fontSize: sizes.fontSize },
          toneStyles.text,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: theme.borderRadius.full,
  },
  label: {
    fontWeight: theme.typography.fontWeights.medium,
  },
  pressed: {
    opacity: 0.7,
  },
});
