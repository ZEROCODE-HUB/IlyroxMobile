import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { ScrollView } from "react-native";
import { AppInput } from "../../../design-system/components/AppInput";
import { SubmitButton } from "./SubmitButton";
import { BackButton } from "./BackButton";
import { AuthFormState } from "../hooks/useAuthForm";
import { COLORS } from "../../../constants/colors";
import { Ionicons } from "@expo/vector-icons";

interface LoginFormProps {
  formState: AuthFormState;
  loading: boolean;
  onUpdateField: <K extends keyof AuthFormState>(
    field: K,
    value: AuthFormState[K],
  ) => void;
  onSubmit: () => void;
  onBack: () => void;
  onForgotPassword: () => void;
}

export function LoginForm({
  formState,
  loading,
  onUpdateField,
  onSubmit,
  onBack,
  onForgotPassword,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
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
          onPress={onForgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Olvidé mi contraseña</Text>
        </TouchableOpacity>
        <SubmitButton loading={loading} onPress={onSubmit} text="Entrar" />
        <BackButton onPress={onBack} text="Volver a opciones" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexShrink: 1,
  },
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
