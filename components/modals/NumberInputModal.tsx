/**
 * NumberInputModal.tsx
 * Modal para ingresar números personalizados cuando se selecciona "Más"
 */

import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import { COLORS } from "../../constants";

interface NumberInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  title: string;
  placeholder?: string;
  initialValue?: string;
  maxValue?: number;
  minValue?: number;
}

export default function NumberInputModal({
  visible,
  onClose,
  onSave,
  title,
  placeholder = "Ingresa un número",
  initialValue = "",
  maxValue = 999,
  minValue = 0,
}: NumberInputModalProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setError("");
    }
  }, [visible, initialValue]);

  const handleSave = () => {
    // Validar que sea un número
    const numValue = parseInt(value);

    if (!value.trim()) {
      setError("Este campo es requerido");
      return;
    }

    if (isNaN(numValue)) {
      setError("Debe ser un número válido");
      return;
    }

    if (numValue < minValue) {
      setError(`El valor mínimo es ${minValue}`);
      return;
    }

    if (numValue > maxValue) {
      setError(`El valor máximo es ${maxValue}`);
      return;
    }

    onSave(value);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <AppInput
              label="Cantidad"
              placeholder={placeholder}
              keyboardType="numeric"
              value={value}
              onChangeText={(text) => {
                setValue(text);
                setError("");
              }}
              error={error}
              autoFocus
              maxLength={3}
            />

            <Text style={styles.hint}>
              Ingresa un número entre {minValue} y {maxValue}
            </Text>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.blackTransparent50,
  },
  modalContainer: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
    ...Platform.select({
      web: {
        outlineStyle: "none",
      },
    }),
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 8,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 8,
    textAlign: "center",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
});