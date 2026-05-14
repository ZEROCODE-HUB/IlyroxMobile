import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { COLORS } from "@/constants/colors";
import { AppHeader } from "@/components/AppHeader";
import { ScreenWrapper } from "@/screens/ScreenWrapper";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { Button } from "@/design-system/components";
import { logger } from "@/utils/logger";

const log = logger.scoped("ForgotPasswordScreen");

const ForgotPasswordScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email validation regex
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    // Validar email
    if (!email.trim()) {
      setError("El correo electrónico es obligatorio");
      return;
    }

    if (!validateEmail(email)) {
      setError("Por favor ingresa un correo electrónico válido");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Enviar código OTP al correo (sin redirectTo)
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email
      );

      if (resetError) {
        log.error("Error al enviar correo:", resetError);
        throw resetError;
      }

      // Navegar directamente a la pantalla de verificación
      router.push({
        pathname: "/verify-password-reset",
        params: { email }
      });

    } catch (error: any) {
      log.error("Error al recuperar contraseña:", error);
      setError(error?.message || "No se pudo enviar el correo. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title="Recuperar Contraseña"
        showBackButton={true}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.formContainer}>
            <Text style={styles.description}>
              Ingresa tu correo electrónico y te enviaremos un código de
              verificación para restablecer tu contraseña.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Correo electrónico <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) {
                    setError("");
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <Button
              label={isSubmitting ? "Enviando..." : "Enviar código"}
              onPress={handleResetPassword}
              disabled={isSubmitting}
              variant="primary"
              size="lg"
              fullWidth
              style={styles.submitButton}
              labelStyle={styles.submitButtonText}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
    justifyContent: "center",
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
  },
  submitButton: {
    borderRadius: 10,
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ForgotPasswordScreen;