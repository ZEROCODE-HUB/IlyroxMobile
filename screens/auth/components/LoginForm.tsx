/**
 * LoginForm.tsx
 * Formulario de inicio de sesión
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { AppInput } from "../../../design-system/components/AppInput";
import { SubmitButton } from "./SubmitButton";
import { BackButton } from "./BackButton";
import { AuthFormState } from "../hooks/useAuthForm";
import { COLORS } from "../../../constants/colors";

interface LoginFormProps {
  formState: AuthFormState;
  loading: boolean;
  onUpdateField: <K extends keyof AuthFormState>(
    field: K,
    value: AuthFormState[K]
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
  return (
    <KeyboardAwareScrollView
      extraScrollHeight={100}
      extraHeight={120}
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
          secureTextEntry
          value={formState.password}
          onChangeText={(v) => onUpdateField("password", v)}
          autoComplete="password"
          textContentType="password"
        />
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
  },
});
