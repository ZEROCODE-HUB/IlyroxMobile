/**
 * BackButton.tsx
 * Botón para volver/cancelar en formularios de auth
 */

import React, { memo } from "react";
import { StyleSheet } from "react-native";
import { COLORS } from "../../../constants/colors";
import { Button } from "@/design-system/components";

interface BackButtonProps {
  onPress: () => void;
  text: string;
}

export const BackButton = memo(({ onPress, text }: BackButtonProps) => (
  <Button
    label={text}
    onPress={onPress}
    variant="ghost"
    size="md"
    fullWidth
    style={styles.button}
    labelStyle={styles.text}
  />
));

const styles = StyleSheet.create({
  button: {
    marginTop: 8,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "400",
  },
});
