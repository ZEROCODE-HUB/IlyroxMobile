import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { AppInput } from "../../../design-system/components/AppInput";
import { SubmitButton } from "./SubmitButton";
import { BackButton } from "./BackButton";
import { AuthFormState } from "../hooks/useAuthForm";
import { COLORS } from "../../../constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface LoginFormProps {
  formState: AuthFormState;
  loading: boolean;
  onUpdateField: <K extends keyof AuthFormState>(
    field: K,
    value: AuthFormState[K],
  ) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function LoginForm({
  formState,
  loading,
  onUpdateField,
  onSubmit,
  onBack,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <KeyboardAwareScrollView
      extraScrollHeight={40}
      extraHeight={60}
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      keyboardOpeningTime={0}
      enableResetScrollToCoords={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.form}>
        <AppInput
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          value={formState.email}
          onChangeText={(v) => onUpdateField("email", v)}
          autoComplete="email"
          textContentType="emailAddress"
        />
        <AppInput
          placeholder="Contraseña"
          secureTextEntry={!showPassword}
          value={formState.password}
          onChangeText={(v) => onUpdateField("password", v)}
          autoComplete="password"
          textContentType="password"
          rightIcon={
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          }
        />
        <TouchableOpacity
          style={styles.forgotPasswordLink}
          onPress={() => {
            router.push("/forgot-password");
          }}
        >
          <Text style={styles.forgotPasswordText}>Olvidé mi contraseña</Text>
        </TouchableOpacity>
        <SubmitButton loading={loading} onPress={onSubmit} text="Entrar" />
        <BackButton onPress={onBack} text="Volver a opciones" />
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  form: {
    width: "100%",
    paddingVertical: 16,
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
});
