/**
 * ReportPropertyModal.tsx
 * Modal para reportar una propiedad con motivo y descripción.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";
import { useReportProperty } from "../../hooks/useReportProperty";

interface ReportPropertyModalProps {
  visible: boolean;
  onClose: () => void;
  propiedadId: string;
  reportadoPorId: string;
  propietarioId: string;
  onSuccess?: () => void;
}

const MOTIVOS = [
  "Información falsa",
  "Spam / Publicidad engañosa",
  "Propiedad ya vendida o rentada",
  "Estafa o fraude",
  "Inapropiado / Ofensivo",
  "Otro",
];

export default function ReportPropertyModal({
  visible,
  onClose,
  propiedadId,
  reportadoPorId,
  propietarioId,
  onSuccess,
}: ReportPropertyModalProps) {
  const [motivo, setMotivo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const { reportProperty, loading } = useReportProperty();

  const handleSendReport = async () => {
    if (!motivo) {
      alert("Por favor selecciona un motivo.");
      return;
    }

    if (!propietarioId) {
      alert("No se pudo identificar al propietario de esta propiedad.");
      return;
    }

    const success = await reportProperty({
      propiedad_id: propiedadId,
      reportado_por: reportadoPorId,
      propietario_id: propietarioId,
      motivo,
      descripcion,
      estado: "pendiente",
    });

    if (success) {
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Reportar Propiedad</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.label}>Motivo del reporte</Text>
            <View style={styles.motivosContainer}>
              {MOTIVOS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.motivoItem,
                    motivo === item && styles.motivoItemSelected,
                  ]}
                  onPress={() => setMotivo(item)}
                >
                  <Ionicons
                    name={
                      motivo === item ? "radio-button-on" : "radio-button-off"
                    }
                    size={20}
                    color={
                      motivo === item ? COLORS.primary : COLORS.textTertiary
                    }
                  />
                  <Text
                    style={[
                      styles.motivoText,
                      motivo === item && styles.motivoTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Descripción adicional (opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Cuéntanos más detalles..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={4}
              value={descripcion}
              onChangeText={setDescripcion}
            />

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSendReport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText}>Enviar Reporte</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  scroll: {
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  motivosContainer: {
    marginBottom: 20,
    gap: 10,
  },
  motivoItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 10,
  },
  motivoItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTransparent,
  },
  motivoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  motivoTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: "600",
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    color: COLORS.textPrimary,
    fontSize: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  submitBtn: {
    backgroundColor: COLORS.error,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
});
