/**
 * ConfirmDialog.tsx
 * Modal de confirmación reutilizable para acciones destructivas
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { Modal, Button, Typography } from "@/design-system/components";

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
  return (
    <Modal
      visible={visible}
      onClose={onCancel}
      variant="center"
      showCloseButton={false}
      dismissOnBackdropPress={!loading}
      contentStyle={styles.content}
    >
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

      <Typography variant="subheading" style={styles.title}>{title}</Typography>
      <Typography variant="body" tone="secondary" style={styles.message}>{message}</Typography>

      <View style={styles.buttonRow}>
        <Button
          variant="outline"
          label={cancelText}
          onPress={onCancel}
          disabled={loading}
          style={styles.button}
        />
        <Button
          variant={danger ? "danger" : "primary"}
          label={confirmText}
          loading={loading}
          onPress={onConfirm}
          style={styles.button}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 24,
    maxWidth: 340,
    alignItems: "center",
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
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    textAlign: "center",
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
  },
});

export default ConfirmDialog;
