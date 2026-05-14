import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { COLORS } from "@/constants/colors";
import { theme } from "@/design-system/theme";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  style,
}) => {
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;

  return (
    <View style={[styles.container, flatStyle]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.action}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  icon: {
    marginBottom: theme.spacing.sm,
    opacity: 0.6,
  },
  title: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  description: {
    fontSize: theme.typography.fontSizes.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 320,
  },
  action: {
    marginTop: theme.spacing.md,
  },
});
