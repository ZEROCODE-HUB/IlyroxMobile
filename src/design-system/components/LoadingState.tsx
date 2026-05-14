import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { COLORS } from "@/constants/colors";
import { theme } from "@/design-system/theme";

export interface LoadingStateProps {
  message?: string;
  size?: "small" | "large";
  fullscreen?: boolean;
  style?: ViewStyle | ViewStyle[];
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  size = "large",
  fullscreen = false,
  style,
}) => {
  const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;

  return (
    <View
      style={[styles.container, fullscreen && styles.fullscreen, flatStyle]}
    >
      <ActivityIndicator size={size} color={COLORS.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  message: {
    fontSize: theme.typography.fontSizes.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
