import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import { theme } from "../theme";

export type TypographyVariant =
  | "heading"
  | "subheading"
  | "title"
  | "body"
  | "bodyBold"
  | "caption"
  | "label";

export type TypographyTone =
  | "default"
  | "secondary"
  | "muted"
  | "primary"
  | "danger"
  | "white";

export interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  tone?: TypographyTone;
  children: React.ReactNode;
}

const variantStyles: Record<TypographyVariant, object> = {
  heading: {
    fontSize: theme.typography.fontSizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    lineHeight: 28,
  },
  subheading: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    lineHeight: 24,
  },
  title: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    lineHeight: 22,
  },
  body: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.normal,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    lineHeight: 20,
  },
  caption: {
    fontSize: theme.typography.fontSizes.xs,
    fontWeight: theme.typography.fontWeights.normal,
    lineHeight: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: theme.typography.fontWeights.semibold,
    lineHeight: 18,
  },
};

const toneColors: Record<TypographyTone, string> = {
  default: COLORS.textPrimary,
  secondary: COLORS.textSecondary,
  muted: COLORS.textTertiary,
  primary: COLORS.primary,
  danger: COLORS.error,
  white: COLORS.white,
};

export const Typography: React.FC<TypographyProps> = ({
  variant = "body",
  tone = "default",
  style,
  children,
  ...rest
}) => {
  return (
    <Text
      style={[
        styles.base,
        variantStyles[variant],
        { color: toneColors[tone] },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    color: COLORS.textPrimary,
  },
});
