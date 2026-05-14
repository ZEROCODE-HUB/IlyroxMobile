/**
 * AuthProviderButtons.tsx
 * Botones para autenticación con proveedores externos
 */

import React, { memo } from "react";
import { StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { AuthProvider } from "../hooks/useExternalAuth";
import { Button } from "@/design-system/components";

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
  // {
  //   icon: "logo-facebook",
  //   label: "Continuar con Facebook",
  //   provider: "facebook",
  //   textColor: COLORS.white,
  //   iconColor: COLORS.white,
  //   backgroundColor: COLORS.facebook,
  // },
  // {
  //   icon: "logo-google",
  //   label: "Continuar con Google",
  //   provider: "google",
  //   textColor: COLORS.white,
  //   iconColor: COLORS.white,
  //   backgroundColor: COLORS.google,
  // },
  // {
  //   icon: "logo-apple",
  //   label: "Continuar con Apple",
  //   provider: "apple",
  //   textColor: COLORS.white,
  //   iconColor: COLORS.white,
  //   backgroundColor: COLORS.apple,
  // },
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.buttonContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {providerConfigs.map((config) => (
          <Button
            key={config.provider}
            label={config.label}
            onPress={() => handlePress(config)}
            disabled={loading}
            loading={loading && config.provider !== "email"}
            iconLeft={
              <Ionicons name={config.icon} size={24} color={config.iconColor} />
            }
            variant="primary"
            size="lg"
            fullWidth
            style={[
              styles.button,
              { backgroundColor: config.backgroundColor },
            ]}
            labelStyle={{ color: config.textColor, fontWeight: "500" }}
          />
        ))}
      </ScrollView>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  buttonContainer: {
    gap: 16,
    paddingVertical: 10,
  },
  button: {
    height: 60,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
});
