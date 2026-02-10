/**
 * CreateAppointmentModal.tsx
 * Modal para crear citas desde el chat
 */

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../context/ToastContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Sub-components
import DatePickerField from "./DatePickerField";
import TimePickerField from "./TimePickerField";
import AppointmentTypeSelector, {
  APPOINTMENT_TYPES,
} from "./AppointmentTypeSelector";
import { createAppointmentStyles as styles } from "./createAppointmentStyles";

interface CreateAppointmentModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  otherUserId: string;
  currentUserId: string;
}

/**
 * Construye una URL de Google Calendar con los datos de la cita
 */
function buildGoogleCalendarUrl(params: {
  fecha: string;
  hora: string;
  tipo: string;
  descripcion: string;
}): string {
  const { fecha, hora, tipo, descripcion } = params;

  // Encontrar label del tipo
  const typeLabel =
    APPOINTMENT_TYPES.find((t) => t.value === tipo)?.label || tipo;

  // Construir fecha/hora de inicio (ISO sin guiones ni dos puntos)
  // fecha = "2026-02-15", hora = "09:00"
  const [year, month, day] = fecha.split("-");
  const [hourStr, minuteStr] = hora.split(":");

  // Formato: YYYYMMDDTHHmmSS
  const startDateTime = `${year}${month}${day}T${hourStr}${minuteStr}00`;

  // Duración por defecto: 1 hora
  const endHour = String(
    Math.min(parseInt(hourStr, 10) + 1, 23),
  ).padStart(2, "0");
  const endDateTime = `${year}${month}${day}T${endHour}${minuteStr}00`;

  const title = encodeURIComponent(`Cita - ${typeLabel}`);
  const details = encodeURIComponent(
    descripcion.trim() || `Cita de tipo: ${typeLabel}`,
  );
  const dates = `${startDateTime}/${endDateTime}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
}

export default function CreateAppointmentModal({
  visible,
  onClose,
  propertyId,
  otherUserId,
  currentUserId,
}: CreateAppointmentModalProps) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const scrollRef = useRef<ScrollView>(null);

  const [fechaText, setFechaText] = useState("");
  const [horaText, setHoraText] = useState("");
  const [tipo, setTipo] = useState<string>("visita");
  const [descripcion, setDescripcion] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  React.useEffect(() => {
    if (visible) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const day = String(tomorrow.getDate()).padStart(2, "0");
      setFechaText(`${year}-${month}-${day}`);
      setHoraText("09:00");
    }
  }, [visible]);

  const validateDate = (dateStr: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;

    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return date >= today;
  };

  const validateTime = (timeStr: string): boolean => {
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(timeStr);
  };

  const determineRoles = async () => {
    const { data: currentUserProfile } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", currentUserId)
      .single();

    const { data: otherUserProfile } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", otherUserId)
      .single();

    let agenteId = "";
    let clienteId = "";

    if (currentUserProfile?.rol === "agente") {
      agenteId = currentUserId;
      clienteId = otherUserId;
    } else if (otherUserProfile?.rol === "agente") {
      agenteId = otherUserId;
      clienteId = currentUserId;
    } else {
      agenteId = currentUserId;
      clienteId = otherUserId;
    }

    return { agenteId, clienteId };
  };

  const handleCreateAppointment = async () => {
    if (!validateDate(fechaText)) {
      Alert.alert(
        "Error",
        "Fecha inválida. Usa formato YYYY-MM-DD y asegúrate que no sea anterior a hoy",
      );
      return;
    }

    if (!validateTime(horaText)) {
      Alert.alert("Error", "Hora inválida. Usa formato HH:MM (24 horas)");
      return;
    }

    try {
      setIsCreating(true);

      const { agenteId, clienteId } = await determineRoles();

      if (agenteId === clienteId) {
        Alert.alert("Error", "No se puede crear una cita con el mismo usuario");
        return;
      }

      const horaStr = `${horaText}:00`;

      const { data, error } = await supabase
        .from("citas")
        .insert({
          propiedad_id: propertyId,
          agente_id: agenteId,
          cliente_id: clienteId,
          created_by: currentUserId,
          fecha: fechaText,
          hora: horaStr,
          tipo,
          descripcion: descripcion.trim() || null,
          estado: "pendiente",
        })
        .select()
        .single();

      if (error) throw error;

      showToast("Cita creada exitosamente", "success");

      // Abrir Google Calendar automáticamente
      const calendarUrl = buildGoogleCalendarUrl({
        fecha: fechaText,
        hora: horaText,
        tipo,
        descripcion,
      });

      try {
        await Linking.openURL(calendarUrl);
      } catch (linkError) {
        console.warn("No se pudo abrir Google Calendar:", linkError);
      }

      onClose();

      // Reset form
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const day = String(tomorrow.getDate()).padStart(2, "0");
      setFechaText(`${year}-${month}-${day}`);
      setHoraText("09:00");
      setTipo("visita");
      setDescripcion("");
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      showToast(error.message || "Error al crear la cita", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputFocus = (_y?: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayBackground}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.container}>
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <Ionicons name="calendar" size={22} color={COLORS.primary} />
                <Text style={styles.title}>Nueva Cita</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                disabled={isCreating}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              ref={scrollRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              bounces={true}
            >
              <DatePickerField
                fechaText={fechaText}
                onDateChange={setFechaText}
                disabled={isCreating}
              />

              <TimePickerField
                horaText={horaText}
                onTimeChange={setHoraText}
                disabled={isCreating}
              />

              <AppointmentTypeSelector
                selectedType={tipo}
                onTypeChange={setTipo}
                disabled={isCreating}
              />

              {/* Descripción */}
              <View style={styles.field}>
                <Text style={styles.label}>
                  <Ionicons
                    name="document-text-outline"
                    size={14}
                    color={COLORS.textSecondary}
                  />
                  {"  "}Detalles adicionales
                  <Text style={styles.optionalLabel}> (opcional)</Text>
                </Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Escribe detalles sobre la cita..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                  numberOfLines={4}
                  editable={!isCreating}
                  textAlignVertical="top"
                  onFocus={() => handleInputFocus(350)}
                />
              </View>

              {/* Spacer para scroll */}
              <View style={{ height: 250 }} />
            </ScrollView>

            {/* Buttons */}
            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={onClose}
                disabled={isCreating}
                activeOpacity={0.7}
              >
                <Text style={styles.buttonSecondaryText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  isCreating && styles.buttonDisabled,
                ]}
                onPress={handleCreateAppointment}
                disabled={isCreating}
                activeOpacity={0.8}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={COLORS.white}
                    />
                    <Text style={styles.buttonPrimaryText}>Crear Cita</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
