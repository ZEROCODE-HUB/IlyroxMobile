/**
 * SubmitButton.tsx
 * Botón de envío reutilizable para formularios de auth
 */

import React, { memo } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { COLORS } from "../../../constants/colors";
import { Button } from "@/design-system/components";

interface SubmitButtonProps {
  loading: boolean;
  onPress: () => void;
  text: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export const SubmitButton = memo(
  ({ loading, onPress, text, disabled = false, style }: SubmitButtonProps) => (
    <Button
      label={text}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      variant="primary"
      size="lg"
      fullWidth
      style={[styles.button, style as ViewStyle]}
    />
  )
);

const styles = StyleSheet.create({
  button: {
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 12,
  },
});
