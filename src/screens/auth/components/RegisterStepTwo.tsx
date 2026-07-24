/**
 * RegisterStepTwo.tsx
 * Paso 2 del registro: Información profesional
 */

import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { AppInput } from "../../../design-system/components/AppInput";
import { Avatar } from "../../../components/shared";
import { SubmitButton } from "./SubmitButton";
import { BackButton } from "./BackButton";
import { LegalAcceptanceText } from "./LegalAcceptanceText";
import { CareerStartDateField } from "./CareerStartDateField";
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

const CAREER_LABELS: Record<string, string> = {
  "Asesor Inmobiliario": "¿Cuándo iniciaste como Asesor Inmobiliario? *",
  "Desarrollador Inmobiliario": "¿Cuándo iniciaste como Desarrollador Inmobiliario? *",
  "Arquitecto": "¿Cuándo iniciaste como Arquitecto? *",
  "Constructor": "¿Cuándo iniciaste como Constructor? *",
};

function getCareerLabel(ocupacion: string): string {
  return CAREER_LABELS[ocupacion] ?? "¿Cuándo iniciaste tu carrera? *";
}

export function RegisterStepTwo({
  formState,
  loading,
  onUpdateField,
  onSubmit,
  onBack,
}: RegisterStepTwoProps) {
  const [showOcupacionModal, setShowOcupacionModal] = useState(false);
  const [showModalidadModal, setShowModalidadModal] = useState(false);
  const [photoTouched, setPhotoTouched] = useState(false);

  const handleSubmit = () => {
    if (!formState.avatarUri) {
      setPhotoTouched(true);
      return;
    }
    onSubmit();
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      onUpdateField("avatarUri", result.assets[0].uri);
    }
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
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
          Por favor, utiliza una foto real de tu rostro. Las cuentas sin foto auténtica podrán ser suspendidas o eliminadas.
        </Text>
      </TouchableOpacity>
      {photoTouched && !formState.avatarUri && (
        <Text style={styles.photoError}>La foto de perfil es obligatoria *</Text>
      )}

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

      {/* Fecha de inicio de carrera */}
      <CareerStartDateField
        value={formState.fechaInicioCarrera}
        onChange={(iso) => onUpdateField("fechaInicioCarrera", iso)}
        label={getCareerLabel(formState.ocupacion)}
      />

      <AppInput
        placeholder="Ej: Asesor con 5 años en el sector residencial de Guadalajara, especializado en propiedades de lujo y arrendamiento *"
        autoCapitalize="sentences"
        keyboardType="default"
        value={formState.biografia}
        onChangeText={(v) => onUpdateField("biografia", v)}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        inputStyle={{ height: 100 }}
        maxLength={200}
        showCounter
      />

      <LegalAcceptanceText />

      <SubmitButton
        loading={loading}
        onPress={handleSubmit}
        text="Finalizar Registro"
      />

      <BackButton onPress={onBack} text="Volver al paso 1" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexShrink: 1,
  },
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
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  selectText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    flex: 1,
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
  photoError: {
    fontSize: 12,
    color: COLORS.error,
    textAlign: "center",
    marginTop: -12,
    marginBottom: 12,
  },
});
