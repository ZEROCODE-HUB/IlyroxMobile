/**
 * ExternalAuthForm.tsx
 * Formulario para completar perfil después de auth externa (Google/Apple/Facebook)
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { AppInput } from "../../../design-system/components/AppInput";
import { Avatar } from "../../../components/shared";
import { SubmitButton } from "./SubmitButton";
import { BackButton } from "./BackButton";
import SelectionModal from "../../../components/modals/SelectionModal";
import { PendingExternalUser, ExternalAuthFormData } from "../hooks/useExternalAuth";
import { ESTADOS_MEXICO } from "../../../constants/estadosMexico";
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

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && date) {
        const iso = date.toISOString().split("T")[0];
        onUpdateField("fechaInicioCarrera", iso);
      }
    } else {
      // iOS: actualiza en tiempo real mientras gira el spinner
      if (date) {
        const iso = date.toISOString().split("T")[0];
        onUpdateField("fechaInicioCarrera", iso);
      }
    }
  };

  const pickerDate = formData.fechaInicioCarrera
    ? new Date(formData.fechaInicioCarrera + "T12:00:00")
    : new Date(new Date().getFullYear() - 5, 0, 1);

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      bottomOffset={20}
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

      {/* Fecha de inicio de carrera */}
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setShowDatePicker(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.selectText,
            !formData.fechaInicioCarrera && styles.selectPlaceholder,
          ]}
        >
          {formData.fechaInicioCarrera
            ? formatDate(formData.fechaInicioCarrera)
            : "¿Cuándo iniciaste tu carrera? *"}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {/* DatePicker Android — aparece directamente */}
      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={handleDateChange}
        />
      )}

      {/* DatePicker iOS — en Modal con botón "Listo" */}
      {Platform.OS === "ios" && (
        <Modal
          transparent
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.iosOverlay}>
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <Text style={styles.iosPickerTitle}>Fecha de inicio</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.iosDoneButton}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleDateChange}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}

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
  // iOS DatePicker Modal
  iosOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  iosPickerContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
  },
  iosPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  iosDoneButton: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
  },
  iosPicker: {
    height: 200,
  },
});
