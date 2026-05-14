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
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";
import { appointmentService } from "@/services/appointmentService";
import { logger } from "@/utils/logger";
import { useModal } from "../../context/ModalContext";
import { useToast } from "../../context/ToastContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const log = logger.scoped("CreateAppointmentModal");

// Sub-components
import DatePickerField from "./DatePickerField";
import TimePickerField from "./TimePickerField";
import AppointmentTypeSelector from "./AppointmentTypeSelector";
import { createAppointmentStyles as styles } from "./createAppointmentStyles";

interface CreateAppointmentModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  otherUserId: string;
  currentUserId: string;
}

import { buildGoogleCalendarUrl } from "./calendarUtils";

export default function CreateAppointmentModal({
  visible,
  onClose,
  propertyId,
  otherUserId,
  currentUserId,
}: CreateAppointmentModalProps) {
  const insets = useSafeAreaInsets();
  const { showModal } = useModal();
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

  const determineRoles = () =>
    appointmentService.resolveRoles(currentUserId, otherUserId);

  const handleCreateAppointment = async () => {
    if (!validateDate(fechaText)) {
      showModal({
        title: "Error",
        message: "Fecha inválida. Usa formato YYYY-MM-DD y asegúrate que no sea anterior a hoy",
        confirmText: "OK",
      });
      return;
    }

    if (!validateTime(horaText)) {
      showModal({ title: "Error", message: "Hora inválida. Usa formato HH:MM (24 horas)", confirmText: "OK" });
      return;
    }

    try {
      setIsCreating(true);

      const { agenteId, clienteId } = await determineRoles();

      if (agenteId === clienteId) {
        showModal({ title: "Error", message: "No se puede crear una cita con el mismo usuario", confirmText: "OK" });
        return;
      }

      const horaStr = `${horaText}:00`;

      await appointmentService.createAppointment({
        propertyId,
        agenteId,
        clienteId,
        createdBy: currentUserId,
        fecha: fechaText,
        hora: horaStr,
        tipo,
        descripcion: descripcion.trim() || null,
      });

      showToast("Cita creada exitosamente", "success");

      // Obtener detalles adicionales para el calendario
      let propertyTitle = "";
      let location = "";
      let otherUserName = "";

      try {
        const propInfo =
          await appointmentService.getPropertyCalendarInfo(propertyId);
        if (propInfo) {
          propertyTitle = propInfo.titulo;
          location = propInfo.location;
        }

        const userData = await appointmentService.getUserBasicInfo(otherUserId);
        if (userData) {
          otherUserName = `${userData.nombre} ${userData.apellido_paterno}`.trim();
        }
      } catch (err) {
        log.warn("Could not fetch details for calendar", err);
      }

      // Abrir Google Calendar automáticamente
      const calendarUrl = buildGoogleCalendarUrl({
        date: fechaText,
        time: horaText,
        type: tipo,
        description: descripcion,
        propertyTitle,
        location,
        otherUserName,
      });

      try {
        await Linking.openURL(calendarUrl);
      } catch (linkError) {
        log.warn("No se pudo abrir Google Calendar:", linkError);
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
      log.error("Error creating appointment:", error);
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
