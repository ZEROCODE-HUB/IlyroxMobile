/**
 * ConfirmDialog.tsx
 * Modal de confirmación reutilizable para acciones destructivas
 */

import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <View style={styles.dialog}>
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              danger ? styles.iconContainerDanger : styles.iconContainerPrimary,
            ]}
          >
            <Ionicons
              name={danger ? "alert-circle" : "help-circle"}
              size={32}
              color={danger ? COLORS.error : COLORS.primary}
            />
          </View>

          {/* Content */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onCancel}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonTextCancel}>{cancelText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                danger ? styles.buttonDanger : styles.buttonPrimary,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.buttonTextConfirm}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    elevation: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainerPrimary: {
    backgroundColor: COLORS.primaryTransparent,
  },
  iconContainerDanger: {
    backgroundColor: COLORS.errorTransparent,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonCancel: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonDanger: {
    backgroundColor: COLORS.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextCancel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  buttonTextConfirm: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
  },
});

export default ConfirmDialog;