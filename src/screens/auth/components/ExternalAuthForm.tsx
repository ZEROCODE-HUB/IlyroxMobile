/**
 * ExternalAuthForm.tsx
 * Formulario para completar perfil después de auth externa (Google/Apple/Facebook)
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
import { PendingExternalUser, ExternalAuthFormData } from "../hooks/useExternalAuth";
import { ESTADOS_MEXICO } from "../../../constants/locations";
import { COLORS } from "../../../constants/colors";

interface ExternalAuthFormProps {
  pendingUser: PendingExternalUser;
  formData: ExternalAuthFormData;
  loading: boolean;
  onUpdateField: <K extends keyof ExternalAuthFormData>(
    field: K,
    value: ExternalAuthFormData[K]
  ) => void;
  onSubmit: () => void;
  onCancel: () => void;
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

EXPERIENCIA_OPTIONS.push({ label: "+ 50 años", value: "50+" });

export function ExternalAuthForm({
  pendingUser,
  formData,
  loading,
  onUpdateField,
  onSubmit,
  onCancel,
}: ExternalAuthFormProps) {
  const [showEstadoModal, setShowEstadoModal] = useState(false);
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
      <Text style={styles.stepTitle}>Completa tu Registro</Text>

      {/* Nombre y Apellido */}
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <AppInput
            placeholder="Nombre"
            value={formData.name}
            onChangeText={(v) => onUpdateField("name", v)}
          />
        </View>
        <View style={styles.halfInput}>
          <AppInput
            placeholder="Apellido Paterno"
            value={formData.lastNamePaterno}
            onChangeText={(v) => onUpdateField("lastNamePaterno", v)}
          />
        </View>
      </View>

      {/* Estado */}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowEstadoModal(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.selectText,
            !formData.estado && styles.selectPlaceholder,
          ]}
        >
          {formData.estado || "Selecciona tu Estado *"}
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
        currentValue={formData.estado}
      />

      {/* Avatar Upload */}
      <TouchableOpacity style={styles.avatarUpload} onPress={handlePickImage}>
        <Avatar
          uri={formData.avatarUri || pendingUser.avatarUrl || undefined}
          name={formData.name || pendingUser.fullName || "User"}
          size={100}
        />
        <Text style={styles.avatarText}>
          {formData.avatarUri ? "Cambiar foto" : "Confirmar foto de perfil"}
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
            !formData.ocupacion && styles.selectPlaceholder,
          ]}
        >
          {formData.ocupacion || "Ocupación *"}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <SelectionModal
        visible={showOcupacionModal}
        onClose={() => setShowOcupacionModal(false)}
        onSelect={(v) => onUpdateField("ocupacion", v)}
        title="Selecciona tu Ocupación"
        options={OCUPACIONES}
        currentValue={formData.ocupacion}
      />

      {/* Modalidad (solo para Asesores) */}
      {formData.ocupacion === "Asesor Inmobiliario" && (
        <>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowModalidadModal(true)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.selectText,
                !formData.modalidad && styles.selectPlaceholder,
              ]}
            >
              {formData.modalidad || "Modalidad *"}
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
            currentValue={formData.modalidad}
          />

          {formData.modalidad === "Inmobiliaria" && (
            <AppInput
              placeholder="Nombre de inmobiliaria *"
              value={formData.nombreInmobiliaria}
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
            !formData.anosExperiencia && styles.selectPlaceholder,
          ]}
        >
          {formData.anosExperiencia
            ? `${formData.anosExperiencia} años`
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
        currentValue={formData.anosExperiencia}
      />

      <SubmitButton
        loading={loading}
        onPress={onSubmit}
        text="Guardar y Continuar"
      />
      <BackButton onPress={onCancel} text="Cancelar registro" />
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
});
