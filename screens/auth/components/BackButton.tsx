/**
 * BackButton.tsx
 * Botón para volver/cancelar en formularios de auth
 */

import React, { memo } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/colors";

interface BackButtonProps {
  onPress: () => void;
  text: string;
}

export const BackButton = memo(({ onPress, text }: BackButtonProps) => (
  <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
    <Text style={styles.text}>{text}</Text>
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  button: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
});
