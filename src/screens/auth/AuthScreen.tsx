/**
 * AuthScreen.tsx
 * Pantalla principal de autenticación (Login / Registro)
 * Refactorizada para modularidad y mejor UX con teclado
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { AppBottomSheet } from "@/design-system/components/AppBottomSheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { useStableSafeInsets } from "@/context/SafeInsetsContext";
import { Button } from "@/design-system/components";

// Hooks
import { useAuthForm } from "./hooks/useAuthForm";
import { useExternalAuth, AuthProvider, ExternalAuthFormData } from "./hooks";

// Componentes
import {
  AuthProviderButtons,
  LoginForm,
  RegisterStepOne,
  RegisterStepTwo,
  ExternalAuthForm,
} from "./components";

type AuthMethod = "none" | "email" | "external";

export default function AuthScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("none");

  // Estado para auth externa
  const [externalFormData, setExternalFormData] =
    useState<ExternalAuthFormData>({
      name: "",
      lastNamePaterno: "",
      lastNameMaterno: "",
      phone: "",
      estado: "",
      avatarUri: null,
      ocupacion: "",
      modalidad: "",
      nombreInmobiliaria: "",
      fechaInicioCarrera: "",
    });

  const { bottom } = useStableSafeInsets();

  // Hooks de autenticación
  const authForm = useAuthForm();
  const externalAuth = useExternalAuth();

  // Abrir modal
  const handleOpenModal = useCallback(
    (mode: "login" | "register") => {
      authForm.setMode(mode);
      authForm.setStep(1);
      authForm.resetForm();
      setAuthMethod("none");
      setModalVisible(true);
    },
    [authForm],
  );

  // Cerrar modal
  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setAuthMethod("none");
    authForm.resetForm();
  }, [authForm]);

  // Manejar auth con proveedor externo
  const handleProviderAuth = useCallback(
    async (provider: AuthProvider) => {
      await externalAuth.handleProviderAuth(
        provider,
        // Callback cuando necesita completar perfil
        (user, extractedData) => {
          setExternalFormData({
            name: extractedData.name || "",
            lastNamePaterno: extractedData.lastNamePaterno || "",
            lastNameMaterno: "",
            phone: "",
            estado: "",
            avatarUri: null,
            ocupacion: "",
            modalidad: "",
            nombreInmobiliaria: "",
            fechaInicioCarrera: "",
          });
          setAuthMethod("external");
        },
        // Callback cuando login exitoso
        () => {
          handleCloseModal();
        },
      );
    },
    [externalAuth, handleCloseModal],
  );

  // Actualizar campo de formulario externo
  const updateExternalField = useCallback(
    <K extends keyof ExternalAuthFormData>(
      field: K,
      value: ExternalAuthFormData[K],
    ) => {
      setExternalFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Finalizar registro externo
  const handleFinalizeExternal = useCallback(async () => {
    await externalAuth.finalizeExternalRegistration(
      externalFormData,
      handleCloseModal,
    );
  }, [externalAuth, externalFormData, handleCloseModal]);

  // Cancelar registro externo
  const handleCancelExternal = useCallback(async () => {
    await externalAuth.cancelExternalRegistration();
    setAuthMethod("none");
  }, [externalAuth]);

  // Manejar login con email
  const handleLogin = useCallback(async () => {
    const success = await authForm.handleLogin();
    if (success) {
      handleCloseModal();
    }
  }, [authForm, handleCloseModal]);

  // Manejar registro con email
  const handleRegister = useCallback(async () => {
    const success = await authForm.handleRegister();
    if (success) {
      handleCloseModal();
    }
  }, [authForm, handleCloseModal]);

  // Validar y avanzar al paso 2
  const handleNextStep = useCallback(() => {
    if (authForm.validateStep1()) {
      authForm.setStep(2);
    }
  }, [authForm]);

  // Renderizar contenido del modal según el estado
  const renderModalContent = () => {
    // Auth externa - completar perfil
    if (authMethod === "external" && externalAuth.pendingUser) {
      return (
        <ExternalAuthForm
          pendingUser={externalAuth.pendingUser}
          formData={externalFormData}
          loading={externalAuth.loading}
          onUpdateField={updateExternalField}
          onSubmit={handleFinalizeExternal}
          onCancel={handleCancelExternal}
        />
      );
    }

    // Selección de método
    if (authMethod === "none") {
      return (
        <AuthProviderButtons
          onProviderPress={handleProviderAuth}
          onEmailPress={() => setAuthMethod("email")}
          loading={externalAuth.loading}
        />
      );
    }

    // Auth con email
    if (authMethod === "email") {
      if (authForm.mode === "login") {
        return (
          <LoginForm
            formState={authForm.formState}
            loading={authForm.loading}
            onUpdateField={authForm.updateField}
            onSubmit={handleLogin}
            onBack={() => setAuthMethod("none")}
          />
        );
      }

      // Registro - Paso 1
      if (authForm.step === 1) {
        return (
          <RegisterStepOne
            formState={authForm.formState}
            fieldErrors={authForm.fieldErrors}
            onUpdateField={authForm.updateField}
            onValidateField={authForm.validateField}
            onNext={handleNextStep}
            onBack={() => setAuthMethod("none")}
          />
        );
      }

      // Registro - Paso 2
      return (
        <RegisterStepTwo
          formState={authForm.formState}
          loading={authForm.loading}
          onUpdateField={authForm.updateField}
          onSubmit={handleRegister}
          onBack={() => authForm.setStep(1)}
        />
      );
    }

    return null;
  };

  // Título del modal según el estado
  const getModalTitle = () => {
    if (externalAuth.pendingUser) return "Completa tu perfil";
    return authForm.mode === "login" ? "Bienvenido de nuevo" : "Crear cuenta";
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <Image
        source={require("../../assets/ImgFondo.jpg")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,2)"]}
        style={styles.gradient}
      />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../assets/Logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Botones principales */}
        <View style={styles.buttonsContainer}>
          <Button
            label="Iniciar Sesión"
            onPress={() => handleOpenModal("login")}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.loginButton}
            labelStyle={styles.loginButtonText}
          />

          <Button
            label="Registrarse"
            onPress={() => handleOpenModal("register")}
            variant="outline"
            size="lg"
            fullWidth
            style={styles.registerButton}
            labelStyle={styles.registerButtonText}
          />
        </View>
      </View>

      {/* Modal de autenticación */}
      <AppBottomSheet visible={modalVisible} onClose={handleCloseModal}>
        <View
          style={[
            styles.modalContent,
            { paddingBottom: Math.max(30, bottom) },
          ]}
        >
          <KeyboardProvider>
            {/* Header del modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
              <TouchableOpacity onPress={handleCloseModal} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Contenido del modal */}
            {renderModalContent()}
          </KeyboardProvider>
        </View>
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  backgroundImage: {
    position: "absolute",
    height: "100%",
    top: 0,
    left: 0,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 60,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    width: "100%",
  },
  logoWrapper: {
    backgroundColor: "transparent",
  },
  logo: {
    width: 240,
    height: 96,
  },
  buttonsContainer: {
    gap: 16,
    width: "100%",
  },
  loginButton: {
    height: 56,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  registerButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,

    minHeight: "40%",
    maxHeight: "90%",
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 12,
  },
});
