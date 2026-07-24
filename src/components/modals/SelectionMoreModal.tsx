import React, { useState, useEffect } from "react";
import { Modal, TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";

interface SelectionMoreModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  title: string;
  currentValue?: string;
  /** Etiqueta de la sección de cantidad (default "Cantidad"); p.ej. "Plantas". */
  quantityLabel?: string;
  /**
   * Valor mínimo de la grilla de cantidad (default 0). Para "Niveles/Plantas"
   * se pasa 1: una construcción no puede tener 0 plantas.
   */
  minQuantity?: number;
}

export const SelectionMoreModal: React.FC<SelectionMoreModalProps> = ({
  visible,
  onClose,
  onSelect,
  title,
  currentValue,
  quantityLabel = "Cantidad",
  minQuantity = 0,
}) => {
  const [selected, setSelected] = useState<string>(
    currentValue || "No indicado",
  );

  useEffect(() => {
    if (visible) {
      setSelected(currentValue || "No indicado");
    }
  }, [visible, currentValue]);

  const handleApply = () => {
    onSelect(selected);
    onClose();
  };

  const renderButton = (value: string, label: string) => {
    const isSelected = selected === value;
    return (
      <TouchableOpacity
        key={value}
        style={[styles.numberButton, isSelected && styles.numberButtonSelected]}
        onPress={() => setSelected(value)}
      >
        <Text
          style={[
            styles.numberButtonText,
            isSelected && styles.numberButtonTextSelected,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {/* No indicado section */}
            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setSelected("No indicado")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioButton,
                  selected === "No indicado" && styles.radioButtonSelected,
                ]}
              >
                {selected === "No indicado" && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <Text style={styles.radioLabel}>No indicado</Text>
            </TouchableOpacity>

            {/* Cantidad section */}
            <Text style={styles.sectionLabel}>{quantityLabel}</Text>
            <View style={styles.buttonGrid}>
              {["0", "1", "2", "3", "4", "5"]
                .filter((num) => Number(num) >= minQuantity)
                .map((num) => renderButton(num, num))}
            </View>

            {/* Buscar desde section */}
            <Text style={styles.sectionLabel}>O buscar desde</Text>
            <View style={styles.buttonGrid}>
              {[1, 2, 3, 4, 5].map((num) =>
                renderButton(`${num}+`, `+${num}`),
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.blackTransparent50,
  },
  modalContent: {
    width: "90%",
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    marginBottom: 16,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingVertical: 4,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.textTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  buttonGrid: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 8,
    marginBottom: 16,
    paddingVertical: 12,
  },
  numberButton: {
    width: "14%",
    aspectRatio: 1.4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  numberButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  numberButtonText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  numberButtonTextSelected: {
    color: COLORS.white,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
