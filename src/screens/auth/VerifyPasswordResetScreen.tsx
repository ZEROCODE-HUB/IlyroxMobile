import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { COLORS } from "@/constants/colors";
import { AppHeader } from "@/components/AppHeader";
import { ScreenWrapper } from "@/screens/ScreenWrapper";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useModal } from "@/context/ModalContext";
import { Button } from "@/design-system/components";
import { logger } from "@/utils/logger";

const log = logger.scoped("VerifyPasswordResetScreen");

const VerifyPasswordResetScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const { showModal } = useModal();
  const email = (params.email as string) || "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors = {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    };

    let isValid = true;

    if (!otp.trim()) {
      newErrors.otp = "El código es obligatorio";
      isValid = false;
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = "La contraseña es obligatoria";
      isValid = false;
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "La contraseña debe tener al menos 6 caracteres";
      isValid = false;
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Confirma tu contraseña";
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleVerifyAndReset = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Verificar el código OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(), // Eliminar espacios en blanco
        type: "recovery",
      });

      if (verifyError) {
        log.error("Error al verificar OTP:", verifyError);
        throw verifyError;
      }

      // Actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        log.error("Error al actualizar contraseña:", updateError);
        throw updateError;
      }

      // Cerrar sesión
      await supabase.auth.signOut();

      // Mostrar mensaje de éxito
      showModal({
        title: "¡Contraseña actualizada!",
        message:
          "Tu contraseña ha sido cambiada con éxito. Inicia sesión con tu nueva contraseña.",
        confirmText: "Ir al Login",
        onConfirm: () => router.replace("/login"),
      });
    } catch (error: any) {
      log.error("Error en el proceso:", error);

      let errorMessage = "Ocurrió un error inesperado. Intenta de nuevo.";

      // Mensajes de error personalizados
      if (error.message?.includes("invalid") || error.message?.includes("Invalid")) {
        errorMessage =
          "Código inválido. Verifica que hayas copiado correctamente el código del correo.";
      } else if (
        error.message?.includes("expired") ||
        error.message?.includes("Token has expired")
      ) {
        errorMessage =
          "El código ha expirado. Por favor, solicita uno nuevo.";
      } else if (error.message?.includes("not found")) {
        errorMessage =
          "No se encontró una solicitud de recuperación. Solicita un nuevo código.";
      }

      showModal({
        title: "Error",
        message: errorMessage,
        confirmText: "OK",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      showModal({
        title: "Error",
        message: "No se pudo obtener el correo electrónico.",
        confirmText: "OK",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      showModal({
        title: "Código reenviado",
        message: "Se ha enviado un nuevo código a tu correo.",
        confirmText: "OK",
      });
    } catch (error: any) {
      showModal({
        title: "Error",
        message: "No se pudo reenviar el código. Intenta de nuevo.",
        confirmText: "OK",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title="Verificar código"
        showBackButton={true}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.formContainer}>
              <Text style={styles.description}>
                Ingresa el código que enviamos a{" "}
                <Text style={styles.emailText}>{email}</Text> y tu nueva
                contraseña.
              </Text>

              {/* Campo de Código */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Código de verificación <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.codeInput,
                    errors.otp && styles.inputError,
                  ]}
                  placeholder="Pega el código del correo"
                  placeholderTextColor={COLORS.textTertiary}
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text);
                    if (errors.otp) {
                      setErrors({ ...errors, otp: "" });
                    }
                  }}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting}
                  multiline={false}
                />
                {errors.otp ? (
                  <Text style={styles.errorText}>{errors.otp}</Text>
                ) : null}
                <Text style={styles.hintText}>
                  Copia y pega el código completo que recibiste en tu correo
                </Text>
              </View>

              {/* Campo de Nueva Contraseña */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Nueva contraseña <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      errors.newPassword && styles.inputError,
                    ]}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor={COLORS.textTertiary}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (errors.newPassword) {
                        setErrors({ ...errors, newPassword: "" });
                      }
                    }}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.newPassword ? (
                  <Text style={styles.errorText}>{errors.newPassword}</Text>
                ) : null}
              </View>

              {/* Campo de Confirmar Contraseña */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Confirmar contraseña <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      errors.confirmPassword && styles.inputError,
                    ]}
                    placeholder="Repite tu contraseña"
                    placeholderTextColor={COLORS.textTertiary}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: "" });
                      }
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={22}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                ) : null}
              </View>

              {/* Botón de Envío */}
              <Button
                label={isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
                onPress={handleVerifyAndReset}
                disabled={isSubmitting}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.submitButton}
                labelStyle={styles.submitButtonText}
              />

              {/* Botón de Reenviar Código */}
              <Button
                label="¿No recibiste el código? Reenviar"
                onPress={handleResendCode}
                disabled={isSubmitting}
                variant="ghost"
                size="md"
                fullWidth
                style={styles.resendButton}
                labelStyle={styles.resendButtonText}
              />
            </View>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  emailText: {
    fontWeight: "600",
    color: COLORS.primary,
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
  codeInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
  },
  passwordContainer: {
    position: "relative",
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1.5,
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 12,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 6,
    fontStyle: "italic",
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
  resendButton: {
    marginTop: 16,
  },
  resendButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: "underline",
    fontWeight: "400",
  },
});

export default VerifyPasswordResetScreen;