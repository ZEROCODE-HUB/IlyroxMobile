import React from "react";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { COLORS } from "@/constants/colors";
import { theme } from "@/design-system/theme";

export type CardVariant = "flat" | "elevated" | "outlined";
export type CardPadding = "none" | "sm" | "md" | "lg";

type BaseProps = {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: keyof typeof theme.borderRadius;
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
};

export type CardProps =
  | (BaseProps & ViewProps & { onPress?: undefined })
  | (BaseProps & PressableProps & { onPress: () => void });

const PADDING_MAP: Record<CardPadding, number> = {
  none: 0,
  sm: theme.spacing.sm,
  md: theme.spacing.md,
  lg: theme.spacing.lg,
};

const VARIANT_STYLES: Record<CardVariant, ViewStyle> = {
  flat: {
    backgroundColor: COLORS.white,
  },
  elevated: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  outlined: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
};

export const Card: React.FC<CardProps> = ({
  variant = "flat",
  padding = "md",
  radius = "lg",
  style,
  children,
  ...rest
}) => {
  const composed: ViewStyle = {
    borderRadius: theme.borderRadius[radius],
    padding: PADDING_MAP[padding],
    ...VARIANT_STYLES[variant],
  };

  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;

  if ("onPress" in rest && rest.onPress) {
    const { onPress, ...pressableRest } = rest as PressableProps;
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          composed,
          pressed && styles.pressed,
          flatStyle,
        ]}
        {...pressableRest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[composed, flatStyle]} {...(rest as ViewProps)}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
});
