/**
 * AuthProviderButtons.tsx
 * Botones para autenticación con proveedores externos
 */

import React, { memo } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { AuthProvider } from "../hooks/useExternalAuth";

interface AuthProviderButtonsProps {
  onProviderPress: (provider: AuthProvider) => void;
  onEmailPress: () => void;
  loading?: boolean;
}

interface ProviderButtonConfig {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  provider: AuthProvider | "email";
  textColor: string;
  iconColor: string;
  backgroundColor: string;
}

const providerConfigs: ProviderButtonConfig[] = [
  {
    icon: "logo-facebook",
    label: "Continuar con Facebook",
    provider: "facebook",
    textColor: COLORS.white,
    iconColor: COLORS.white,
    backgroundColor: COLORS.facebook,
  },
  {
    icon: "logo-google",
    label: "Continuar con Google",
    provider: "google",
    textColor: COLORS.white,
    iconColor: COLORS.white,
    backgroundColor: COLORS.google,
  },
  {
    icon: "logo-apple",
    label: "Continuar con Apple",
    provider: "apple",
    textColor: COLORS.white,
    iconColor: COLORS.white,
    backgroundColor: COLORS.apple,
  },
  {
    icon: "mail",
    label: "Continuar con Email",
    provider: "email",
    textColor: COLORS.textPrimary,
    iconColor: COLORS.textPrimary,
    backgroundColor: COLORS.primaryTransparent,
  },
];

export const AuthProviderButtons = memo(
  ({
    onProviderPress,
    onEmailPress,
    loading = false,
  }: AuthProviderButtonsProps) => {
    const handlePress = (config: ProviderButtonConfig) => {
      if (config.provider === "email") {
        onEmailPress();
      } else {
        onProviderPress(config.provider);
      }
    };

    return (
      <View style={styles.container}>
        <View style={styles.buttonContainer}>
          {providerConfigs.map((config) => (
            <TouchableOpacity
              key={config.provider}
              style={[
                styles.button,
                { backgroundColor: config.backgroundColor },
              ]}
              onPress={() => handlePress(config)}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading && config.provider !== "email" ? (
                <ActivityIndicator color={config.iconColor} size="small" />
              ) : (
                <Ionicons
                  name={config.icon}
                  size={24}
                  color={config.iconColor}
                />
              )}
              <Text style={[styles.buttonText, { color: config.textColor }]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 30,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
