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
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import { COLORS } from "../../constants";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../context/ToastContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

interface CreateAppointmentModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  otherUserId: string;
  currentUserId: string;
}

const APPOINTMENT_TYPES = [
  { value: "visita", label: "Visita a propiedad", icon: "home-outline" },
  { value: "llamada", label: "Llamada telefónica", icon: "call-outline" },
  { value: "videollamada", label: "Videollamada", icon: "videocam-outline" },
  { value: "reunion", label: "Reunión presencial", icon: "people-outline" },
];

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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

  const handleInputFocus = (y: number) => {
    // Scroll al campo cuando recibe focus
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: y - 100, animated: true });
    }, 100);
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
              {/* Fecha */}
              <View style={styles.field}>
                <Text style={styles.label}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={COLORS.textSecondary}
                  />
                  {"  "}Fecha
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.inputContainer}
                  activeOpacity={0.7}
                  disabled={isCreating}
                >
                  <Text style={styles.inputText}>
                    {fechaText
                      ? fechaText.split("-").reverse().join("/")
                      : "Seleccionar fecha"}
                  </Text>
                  <View style={styles.iconBadge}>
                    <Ionicons
                      name="calendar"
                      size={18}
                      color={COLORS.primary}
                    />
                  </View>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={(() => {
                      const parts = fechaText.split("-");
                      if (parts.length === 3) {
                        return new Date(
                          parseInt(parts[0]),
                          parseInt(parts[1]) - 1,
                          parseInt(parts[2]),
                        );
                      }
                      return new Date();
                    })()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === "android") setShowDatePicker(false);
                      if (selectedDate) {
                        const y = selectedDate.getFullYear();
                        const m = String(selectedDate.getMonth() + 1).padStart(
                          2,
                          "0",
                        );
                        const d = String(selectedDate.getDate()).padStart(
                          2,
                          "0",
                        );
                        setFechaText(`${y}-${m}-${d}`);
                        if (Platform.OS === "ios") setShowDatePicker(false);
                      } else if (event.type === "dismissed") {
                        setShowDatePicker(false);
                      }
                    }}
                  />
                )}
              </View>

              {/* Hora */}
              <View style={styles.field}>
                <Text style={styles.label}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={COLORS.textSecondary}
                  />
                  {"  "}Hora
                </Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  style={styles.inputContainer}
                  activeOpacity={0.7}
                  disabled={isCreating}
                >
                  <Text style={styles.inputText}>
                    {horaText || "Seleccionar hora"}
                  </Text>
                  <View style={styles.iconBadge}>
                    <Ionicons name="time" size={18} color={COLORS.primary} />
                  </View>
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={(() => {
                      const [h, m] = (horaText || "09:00")
                        .split(":")
                        .map(Number);
                      const d = new Date();
                      d.setHours(h, m, 0, 0);
                      return d;
                    })()}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === "android") setShowTimePicker(false);
                      if (selectedDate) {
                        const h = String(selectedDate.getHours()).padStart(
                          2,
                          "0",
                        );
                        const m = String(selectedDate.getMinutes()).padStart(
                          2,
                          "0",
                        );
                        setHoraText(`${h}:${m}`);
                        if (Platform.OS === "ios") setShowTimePicker(false);
                      } else if (event.type === "dismissed") {
                        setShowTimePicker(false);
                      }
                    }}
                  />
                )}
                <Text style={styles.hint}>Formato 24h (ej: 09:00, 14:30)</Text>
              </View>

              {/* Tipo */}
              <View style={styles.field}>
                <Text style={styles.label}>
                  <Ionicons
                    name="options-outline"
                    size={14}
                    color={COLORS.textSecondary}
                  />
                  {"  "}Tipo de cita
                </Text>
                <View style={styles.typeGrid}>
                  {APPOINTMENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeButton,
                        tipo === type.value && styles.typeButtonActive,
                      ]}
                      onPress={() => setTipo(type.value)}
                      disabled={isCreating}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={18}
                        color={
                          tipo === type.value
                            ? COLORS.primary
                            : COLORS.textTertiary
                        }
                      />
                      <Text
                        style={[
                          styles.typeButtonText,
                          tipo === type.value && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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
                    <Ionicons name="checkmark" size={18} color={COLORS.white} />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.85,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  optionalLabel: {
    fontWeight: "400",
    color: COLORS.textTertiary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  iconBadge: {
    backgroundColor: "rgba(37, 99, 235, 0.1)", // Primary with low opacity
    padding: 6,
    borderRadius: 8,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 6,
    marginLeft: 4,
  },
  typeGrid: {
    gap: 10,
  },
  typeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    gap: 12,
  },
  typeButtonActive: {
    backgroundColor: "#F0FDFA",
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  typeButtonTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  textArea: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 100,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: COLORS.white,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: "#F3F4F6",
  },
  buttonSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
