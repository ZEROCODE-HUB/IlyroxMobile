/**
 * SaleContractModal.tsx
 * Modal que aparece al cambiar el estado de una propiedad a "Vendida" o "Rentada"
 * durante la edición. Solicita tipo de contrato, moneda y precio final.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

interface SaleContractModalProps {
  visible: boolean;
  /** "Vendida" o "Rentada" */
  statusType: "Vendida" | "Rentada";
  onConfirm: (data: {
    tipo_contrato: "venta" | "renta";
    moneda: "USD" | "MXN";
    precio: number;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const SaleContractModal: React.FC<SaleContractModalProps> = ({
  visible,
  statusType,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const tipoContrato: "venta" | "renta" =
    statusType === "Vendida" ? "venta" : "renta";

  const [moneda, setMoneda] = useState<"USD" | "MXN">("MXN");
  const [precio, setPrecio] = useState("");

  // Reiniciar al abrir
  useEffect(() => {
    if (visible) {
      setMoneda("MXN");
      setPrecio("");
    }
  }, [visible]);

  const handleCurrencyChange = (text: string) => {
    const rawValue = text.replace(/,/g, "");
    if (/^\d*\.?\d*$/.test(rawValue)) {
      const parts = rawValue.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setPrecio(parts.join("."));
    }
  };

  const handleConfirm = () => {
    const numericPrecio = parseFloat(precio.replace(/,/g, ""));
    if (!numericPrecio || numericPrecio <= 0) {
      return; // No permitir sin precio
    }
    onConfirm({
      tipo_contrato: tipoContrato,
      moneda,
      precio: numericPrecio,
    });
  };

  const titulo =
    statusType === "Vendida" ? "Registrar Venta" : "Registrar Renta";

  const descripcion =
    statusType === "Vendida"
      ? "Ingresa los datos de la venta realizada."
      : "Ingresa los datos de la renta acordada.";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Header con icono */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={statusType === "Vendida" ? "bag-check" : "key"}
              size={32}
              color={COLORS.white}
            />
          </View>

          <Text style={styles.title}>{titulo}</Text>
          <Text style={styles.description}>{descripcion}</Text>

          {/* Tipo de contrato (solo lectura) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Tipo de Contrato</Text>
            <View style={styles.readOnlyField}>
              <Ionicons
                name={statusType === "Vendida" ? "pricetag" : "document-text"}
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.readOnlyText}>
                {tipoContrato === "venta" ? "Venta" : "Renta"}
              </Text>
            </View>
          </View>

          {/* Moneda */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Moneda</Text>
            <View style={styles.currencyToggle}>
              <TouchableOpacity
                style={[
                  styles.currencyBtn,
                  moneda === "MXN" && styles.currencyBtnActive,
                ]}
                onPress={() => setMoneda("MXN")}
              >
                <Text
                  style={[
                    styles.currencyText,
                    moneda === "MXN" && styles.currencyTextActive,
                  ]}
                >
                  🇲🇽 MXN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.currencyBtn,
                  moneda === "USD" && styles.currencyBtnActive,
                ]}
                onPress={() => setMoneda("USD")}
              >
                <Text
                  style={[
                    styles.currencyText,
                    moneda === "USD" && styles.currencyTextActive,
                  ]}
                >
                  🇺🇸 USD
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Precio */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Precio de {statusType === "Vendida" ? "Venta" : "Renta"}
            </Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.pricePrefix}>
                {moneda === "MXN" ? "$" : "US$"}
              </Text>
              <TextInput
                style={styles.priceInput}
                value={precio}
                onChangeText={handleCurrencyChange}
                placeholder="0"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Botones */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                (!precio || loading) && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!precio || loading}
            >
              {loading ? (
                <Text style={styles.confirmText}>Guardando...</Text>
              ) : (
                <Text style={styles.confirmText}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    alignItems: "center",
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  fieldGroup: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  readOnlyField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 8,
  },
  readOnlyText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  currencyToggle: {
    flexDirection: "row",
    gap: 10,
  },
  currencyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    alignItems: "center",
  },
  currencyBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTransparent,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  currencyTextActive: {
    color: COLORS.primary,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  pricePrefix: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.background,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },
});
