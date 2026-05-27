/**
 * RegisterStepOne.tsx
 * Paso 1 del registro: Información básica
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import { SubmitButton } from "./SubmitButton";
import { BackButton } from "./BackButton";
import SelectionModal from "../../../components/modals/SelectionModal";
import { AuthFormState, getPasswordStrength } from "../hooks/useAuthForm";
import { ESTADOS_MEXICO } from "../../../constants/estadosMexico";
import { COLORS } from "../../../constants/colors";

interface RegisterStepOneProps {
  formState: AuthFormState;
  fieldErrors: Record<string, string>;
  onUpdateField: <K extends keyof AuthFormState>(
    field: K,
    value: AuthFormState[K],
  ) => void;
  onValidateField: (field: keyof AuthFormState, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function RegisterStepOne({
  formState,
  fieldErrors,
  onUpdateField,
  onValidateField,
  onNext,
  onBack,
}: RegisterStepOneProps) {
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdFocused, setPwdFocused] = useState(false);

  const passwordStrength = getPasswordStrength(formState.password);

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
      <Text style={styles.stepTitle}>Información Básica</Text>

      <AppInput
        placeholder="Nombre *"
        value={formState.name}
        onChangeText={(v) => onUpdateField("name", v)}
        onBlur={() => onValidateField("name", formState.name)}
        error={fieldErrors.name}
        autoComplete="given-name"
        textContentType="givenName"
      />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <AppInput
            placeholder="Apellido Paterno *"
            value={formState.lastNamePaterno}
            onChangeText={(v) => onUpdateField("lastNamePaterno", v)}
            onBlur={() => onValidateField("lastNamePaterno", formState.lastNamePaterno)}
            error={fieldErrors.lastNamePaterno}
            autoComplete="family-name"
            textContentType="familyName"
          />
        </View>
        <View style={styles.halfInput}>
          <AppInput
            placeholder="Apellido Materno *"
            value={formState.lastNameMaterno}
            onChangeText={(v) => onUpdateField("lastNameMaterno", v)}
            onBlur={() => onValidateField("lastNameMaterno", formState.lastNameMaterno)}
            error={fieldErrors.lastNameMaterno}
          />
        </View>
      </View>

      <AppInput
        placeholder="Correo electrónico *"
        autoCapitalize="none"
        keyboardType="email-address"
        value={formState.email}
        onChangeText={(v) => onUpdateField("email", v)}
        onBlur={() => onValidateField("email", formState.email)}
        error={fieldErrors.email}
        autoComplete="email"
        textContentType="emailAddress"
      />

      <AppInput
        placeholder="Celular *"
        keyboardType="phone-pad"
        value={formState.phone}
        onChangeText={(v) => onUpdateField("phone", v)}
        onBlur={() => onValidateField("phone", formState.phone)}
        error={fieldErrors.phone}
        textContentType="telephoneNumber"
      />

      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowEstadoModal(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.selectText,
            !formState.estado && styles.selectPlaceholder,
          ]}
        >
          {formState.estado || "Selecciona tu Estado *"}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <SelectionModal
        visible={showEstadoModal}
        onClose={() => setShowEstadoModal(false)}
        onSelect={(v) => onUpdateField("estado", v)}
        title="Selecciona tu Estado"
        options={[...ESTADOS_MEXICO]}
        searchable
        currentValue={formState.estado}
      />

      <AppInput
        placeholder="Contraseña *"
        secureTextEntry={!showPassword}
        value={formState.password}
        onChangeText={(v) => onUpdateField("password", v)}
        onFocus={() => setPwdFocused(true)}
        onBlur={() => { setPwdFocused(false); onValidateField("password", formState.password); }}
        error={fieldErrors.password}
        autoComplete="new-password"
        textContentType="newPassword"
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
      {(pwdFocused || (formState.password.length > 0 && !!fieldErrors.password)) && (
        <View style={styles.pwdStrength}>
          {passwordStrength.map((r) => (
            <View key={r.label} style={styles.pwdRule}>
              <Ionicons
                name={r.met ? "checkmark-circle" : "ellipse-outline"}
                size={13}
                color={r.met ? COLORS.success : COLORS.textTertiary}
              />
              <Text style={[styles.pwdRuleText, r.met && styles.pwdRuleMet]}>{r.label}</Text>
            </View>
          ))}
        </View>
      )}

      <AppInput
        placeholder="Confirmar contraseña *"
        secureTextEntry={!showConfirmPassword}
        value={formState.confirmPassword}
        onChangeText={(v) => onUpdateField("confirmPassword", v)}
        onBlur={() => onValidateField("confirmPassword", formState.confirmPassword)}
        error={fieldErrors.confirmPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        rightIcon={
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={22}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        }
      />

      <SubmitButton loading={false} onPress={onNext} text="Siguiente" />
      <BackButton onPress={onBack} text="Volver a opciones" />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  selectText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  selectPlaceholder: {
    color: COLORS.textTertiary,
  },
  pwdStrength: {
    marginTop: -10,
    marginBottom: 12,
    paddingHorizontal: 4,
    gap: 4,
  },
  pwdRule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pwdRuleText: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  pwdRuleMet: {
    color: COLORS.success,
  },
});
