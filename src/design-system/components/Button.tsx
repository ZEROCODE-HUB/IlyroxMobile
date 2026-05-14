import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { COLORS } from "@/constants/colors";
import { theme } from "@/design-system/theme";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline";
export type ButtonSize = "sm" | "md" | "lg";

type PressableWithoutChildren = Omit<PressableProps, "children" | "style">;

export interface ButtonProps extends PressableWithoutChildren {
  label?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  labelStyle?: TextStyle;
}

const SIZES: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number; gap: number }
> = {
  sm: {
    height: 36,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSizes.sm,
    gap: theme.spacing.xs,
  },
  md: {
    height: 44,
    paddingHorizontal: theme.spacing.lg,
    fontSize: theme.typography.fontSizes.md,
    gap: theme.spacing.sm,
  },
  lg: {
    height: 52,
    paddingHorizontal: theme.spacing.xl,
    fontSize: theme.typography.fontSizes.md,
    gap: theme.spacing.sm,
  },
};

function getVariantStyles(
  variant: ButtonVariant,
  disabled: boolean,
  pressed: boolean,
): { container: ViewStyle; label: TextStyle } {
  const dim = disabled ? 0.5 : 1;

  switch (variant) {
    case "primary":
      return {
        container: {
          backgroundColor: pressed ? COLORS.primaryDark : COLORS.primary,
          opacity: dim,
        },
        label: { color: COLORS.white },
      };
    case "secondary":
      return {
        container: {
          backgroundColor: pressed ? COLORS.backgroundDark : COLORS.background,
          borderWidth: 1,
          borderColor: COLORS.cardBorder,
          opacity: dim,
        },
        label: { color: COLORS.textPrimary },
      };
    case "ghost":
      return {
        container: {
          backgroundColor: pressed ? COLORS.primaryTransparent : "transparent",
          opacity: dim,
        },
        label: { color: COLORS.primary },
      };
    case "outline":
      return {
        container: {
          backgroundColor: pressed ? COLORS.primaryTransparent : "transparent",
          borderWidth: 1,
          borderColor: COLORS.primary,
          opacity: dim,
        },
        label: { color: COLORS.primary },
      };
    case "danger":
      return {
        container: {
          backgroundColor: pressed ? COLORS.errorDark : COLORS.error,
          opacity: dim,
        },
        label: { color: COLORS.white },
      };
  }
}

export const Button: React.FC<ButtonProps> = ({
  label,
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  disabled,
  style,
  labelStyle,
  onPress,
  ...rest
}) => {
  const isDisabled = disabled || loading;
  const sizeStyles = SIZES[size];

  const flatStyle = useMemo<ViewStyle | undefined>(() => {
    if (!style) return undefined;
    return Array.isArray(style) ? Object.assign({}, ...style) : style;
  }, [style]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      {...rest}
      style={({ pressed }) => {
        const variantStyles = getVariantStyles(
          variant,
          Boolean(isDisabled),
          pressed,
        );
        return [
          styles.base,
          {
            height: sizeStyles.height,
            paddingHorizontal: sizeStyles.paddingHorizontal,
            gap: sizeStyles.gap,
          },
          fullWidth && styles.fullWidth,
          variantStyles.container,
          flatStyle,
        ];
      }}
    >
      {({ pressed }) => {
        const variantStyles = getVariantStyles(
          variant,
          Boolean(isDisabled),
          pressed,
        );
        return (
          <View style={[styles.content, { gap: sizeStyles.gap }]}>
            {loading ? (
              <ActivityIndicator
                size="small"
                color={variantStyles.label.color as string}
              />
            ) : (
              <>
                {iconLeft}
                {label ? (
                  <Text
                    style={[
                      styles.label,
                      { fontSize: sizeStyles.fontSize },
                      variantStyles.label,
                      labelStyle,
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                ) : (
                  children
                )}
                {iconRight}
              </>
            )}
          </View>
        );
      }}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  fullWidth: {
    alignSelf: "stretch",
    width: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: theme.typography.fontWeights.semibold,
    textAlign: "center",
  },
});
