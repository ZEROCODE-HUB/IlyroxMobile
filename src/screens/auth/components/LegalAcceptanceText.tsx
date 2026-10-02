/**
 * LegalAcceptanceText.tsx
 * Texto de aceptación de Términos y Política de privacidad (requerido para App Store).
 * Se muestra junto al botón que crea la cuenta.
 * Si se le pasan `accepted` y `onChange`, renderiza un checkbox control addo.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { COLORS } from "../../../constants/colors";
import { LEGAL_URLS } from "../../../constants/legal";

interface LegalAcceptanceTextProps {
  accepted?: boolean;
  onChange?: (value: boolean) => void;
}

export function LegalAcceptanceText({ accepted, onChange }: LegalAcceptanceTextProps) {
  const open = (url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  const isControlled = accepted !== undefined && onChange !== undefined;

  const handleToggle = () => {
    if (isControlled) {
      onChange(!accepted);
    }
  };

  return (
    <View style={styles.container}>
      {isControlled && (
        <TouchableOpacity
          onPress={handleToggle}
          style={styles.checkbox}
          activeOpacity={0.7}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <Ionicons
            name={accepted ? "checkbox" : "square-outline"}
            size={22}
            color={accepted ? COLORS.primary : COLORS.textTertiary}
          />
        </TouchableOpacity>
      )}
      <Text style={[styles.text, isControlled && styles.textControlled]}>
        Al registrarte aceptas nuestros{" "}
        <Text style={styles.link} onPress={() => open(LEGAL_URLS.terms)}>
          Términos y condiciones
        </Text>{" "}
        y la{" "}
        <Text style={styles.link} onPress={() => open(LEGAL_URLS.privacy)}>
          Política de privacidad
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  checkbox: {
    marginRight: 8,
    marginTop: 1,
  },
  text: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    flex: 1,
    lineHeight: 17,
  },
  textControlled: {
    textAlign: "left",
  },
  link: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
