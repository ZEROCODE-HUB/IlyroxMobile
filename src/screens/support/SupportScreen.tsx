import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { COLORS } from "@/constants/colors";
import { AppHeader } from "@/components/AppHeader";
import { ScreenWrapper } from "@/screens/ScreenWrapper";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useModal } from "@/context/ModalContext";

const SupportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { showModal } = useModal();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({
    subject: "",
    message: "",
    email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email validation regex
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors = {
      subject: "",
      message: "",
      email: "",
    };

    let isValid = true;

    if (!subject.trim()) {
      newErrors.subject = "El asunto es obligatorio";
      isValid = false;
    }

    if (!message.trim()) {
      newErrors.message = "El mensaje es obligatorio";
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = "El correo electrónico es obligatorio";
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = "Por favor ingresa un correo electrónico válido";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleResetPassword = async () => {
    router.push("/reset-password");
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Obtener el usuario autenticado
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Insertar el mensaje de soporte en la base de datos
      const { data, error } = await supabase.from("soporte").insert([
        {
          asunto: subject,
          mensaje: message,
          correo: email,
          usuario_id: user?.id || null,
          estado: "pendiente",
        },
      ]);

      if (error) {
        console.error("Error al insertar en Supabase:", error);
        throw error;
      }

      console.log("Mensaje de soporte guardado exitosamente:", data);

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.alert(
            "Mensaje enviado exitosamente. Nos pondremos en contacto pronto.",
          );
        }
      } else {
        showModal({
          title: "Éxito",
          message:
            "Mensaje enviado exitosamente. Nos pondremos en contacto pronto.",
          confirmText: "OK",
          onConfirm: () => navigation.goBack(),
        });
      }

      // Limpiar formulario
      setSubject("");
      setMessage("");
      setEmail("");
      setErrors({ subject: "", message: "", email: "" });

      // Volver atrás en web
      if (Platform.OS === "web") {
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (error) {
      console.error("Error al enviar mensaje de soporte:", error);
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.alert(
            "Error al enviar el mensaje. Por favor intenta de nuevo.",
          );
        }
      } else {
        showModal({
          title: "Error",
          message: "No se pudo enviar el mensaje. Por favor intenta de nuevo.",
          confirmText: "OK",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title="Soporte"
        showBackButton={true}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={styles.description}>
              ¿Necesitas ayuda? Completa el formulario y nos pondremos en
              contacto contigo lo antes posible.
            </Text>

            {/* Campo de Asunto */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Asunto <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.subject && styles.inputError]}
                placeholder="Ingresa el asunto"
                placeholderTextColor={COLORS.textTertiary}
                value={subject}
                onChangeText={(text) => {
                  setSubject(text);
                  if (errors.subject) {
                    setErrors({ ...errors, subject: "" });
                  }
                }}
                editable={!isSubmitting}
              />
              {errors.subject ? (
                <Text style={styles.errorText}>{errors.subject}</Text>
              ) : null}
            </View>

            {/* Campo de Correo */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Correo electrónico <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) {
                    setErrors({ ...errors, email: "" });
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting}
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Campo de Mensaje */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Mensaje <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  errors.message && styles.inputError,
                ]}
                placeholder="Describe tu consulta o problema"
                placeholderTextColor={COLORS.textTertiary}
                value={message}
                onChangeText={(text) => {
                  setMessage(text);
                  if (errors.message) {
                    setErrors({ ...errors, message: "" });
                  }
                }}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
              {errors.message ? (
                <Text style={styles.errorText}>{errors.message}</Text>
              ) : null}
            </View>

            {/* Botón de Envío */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Enviando..." : "Enviar mensaje"}
              </Text>
            </TouchableOpacity>
          </View>
          {/* <View style={[styles.formContainer, { marginTop: 15 }]}>
            <Text>¿Desea restaurar su contraseña?</Text>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleResetPassword}
            >
              <Text style={styles.submitButtonText}>Restaurar Contraseña</Text>
            </TouchableOpacity>
          </View> */}
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
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
  },
  formContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
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
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
});

export default SupportScreen;
