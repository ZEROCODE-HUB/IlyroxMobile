/**
 * RegisterStepTwo.tsx
 * Paso 2 del registro: Información profesional
 */

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { AppInput } from "../../../design-system/components/AppInput";
import { Avatar } from "../../../components/shared";
import { SubmitButton } from "./SubmitButton";
import { BackButton } from "./BackButton";
import SelectionModal from "../../../components/modals/SelectionModal";
import { AuthFormState } from "../hooks/useAuthForm";
import { COLORS } from "../../../constants/colors";

interface RegisterStepTwoProps {
  formState: AuthFormState;
  loading: boolean;
  onUpdateField: <K extends keyof AuthFormState>(
    field: K,
    value: AuthFormState[K],
  ) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const OCUPACIONES = [
  "Asesor Inmobiliario",
  "Desarrollador Inmobiliario",
  "Arquitecto",
  "Constructor",
];

const MODALIDADES = ["Inmobiliaria", "Independiente"];

const EXPERIENCIA_OPTIONS = [...Array(51).keys()].map((n) => ({
  label: `${n} años`,
  value: n.toString(),
}));

EXPERIENCIA_OPTIONS.push({
  label: "+ 50 años",
  value: "50+",
});

export function RegisterStepTwo({
  formState,
  loading,
  onUpdateField,
  onSubmit,
  onBack,
}: RegisterStepTwoProps) {
  const [showOcupacionModal, setShowOcupacionModal] = useState(false);
  const [showModalidadModal, setShowModalidadModal] = useState(false);
  const [showExperienciaModal, setShowExperienciaModal] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      onUpdateField("avatarUri", result.assets[0].uri);
    }
  };

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
      <Text style={styles.stepTitle}>Información Profesional</Text>

      {/* Avatar Upload */}
      <TouchableOpacity style={styles.avatarUpload} onPress={handlePickImage}>
        <Avatar
          uri={formState.avatarUri || undefined}
          name={formState.name || "User"}
          size={100}
        />
        <Text style={styles.avatarText}>
          {formState.avatarUri ? "Cambiar foto" : "Agregar foto de perfil *"}
        </Text>
        <Text style={styles.avatarHint}>
          Se recomienda encarecidamente una foto real del usuario.
        </Text>
      </TouchableOpacity>

      {/* Ocupación */}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowOcupacionModal(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.selectText,
            !formState.ocupacion && styles.selectPlaceholder,
          ]}
        >
          {formState.ocupacion || "Ocupación *"}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <SelectionModal
        visible={showOcupacionModal}
        onClose={() => setShowOcupacionModal(false)}
        onSelect={(v) => onUpdateField("ocupacion", v)}
        title="Selecciona tu Ocupación"
        options={OCUPACIONES}
        currentValue={formState.ocupacion}
      />

      {/* Modalidad (solo para Asesores) */}
      {formState.ocupacion === "Asesor Inmobiliario" && (
        <>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowModalidadModal(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.selectText,
                !formState.modalidad && styles.selectPlaceholder,
              ]}
            >
              {formState.modalidad || "Modalidad *"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          <SelectionModal
            visible={showModalidadModal}
            onClose={() => setShowModalidadModal(false)}
            onSelect={(v) => onUpdateField("modalidad", v)}
            title="Selecciona tu Modalidad"
            options={MODALIDADES}
            currentValue={formState.modalidad}
          />

          {formState.modalidad === "Inmobiliaria" && (
            <AppInput
              placeholder="Nombre de inmobiliaria *"
              value={formState.nombreInmobiliaria}
              onChangeText={(v) => onUpdateField("nombreInmobiliaria", v)}
            />
          )}
        </>
      )}

      {/* Años de experiencia */}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowExperienciaModal(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.selectText,
            !formState.anosExperiencia && styles.selectPlaceholder,
          ]}
        >
          {formState.anosExperiencia
            ? `${formState.anosExperiencia} años`
            : "Años de experiencia *"}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <SelectionModal
        visible={showExperienciaModal}
        onClose={() => setShowExperienciaModal(false)}
        onSelect={(v) => onUpdateField("anosExperiencia", v)}
        title="Años de experiencia"
        options={EXPERIENCIA_OPTIONS}
        currentValue={formState.anosExperiencia}
      />

      <AppInput
        placeholder="Biografía *"
        autoCapitalize="sentences"
        keyboardType="default"
        value={formState.biografia}
        onChangeText={(v) => onUpdateField("biografia", v)}
        numberOfLines={4}
        inputStyle={{ height: 100 }}
        maxLength={200}
        showCounter
      />

      <SubmitButton
        loading={loading}
        onPress={onSubmit}
        text="Finalizar Registro"
        disabled={!formState.avatarUri}
      />

      <BackButton onPress={onBack} text="Volver al paso 1" />
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
  avatarUpload: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarText: {
    marginTop: 8,
    color: COLORS.primary,
    fontWeight: "600",
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
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
  avatarHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 20,
  },
});
