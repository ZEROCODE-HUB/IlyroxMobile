/**
 * NumberInputModal.tsx
 * Modal para ingresar números personalizados cuando se selecciona "Más"
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import { Modal } from "@/design-system/components";
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
      onClose={onClose}
      variant="center"
      title={title}
      contentStyle={styles.container}
    >
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "85%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalContent: {
    padding: 20,
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
