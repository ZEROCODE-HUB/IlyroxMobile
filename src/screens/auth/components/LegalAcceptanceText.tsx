/**
 * LegalAcceptanceText.tsx
 * Texto de aceptación de Términos y Política de privacidad (requerido para App Store).
 * Se muestra junto al botón que crea la cuenta.
 */

import React from "react";
import { Text, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { COLORS } from "../../../constants/colors";
import { LEGAL_URLS } from "../../../constants/legal";

export function LegalAcceptanceText() {
  const open = (url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => {});
  };

  return (
    <Text style={styles.text}>
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
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 8,
    lineHeight: 17,
  },
  link: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
