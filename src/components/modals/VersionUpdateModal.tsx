import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { COLORS } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { Modal } from "@/design-system/components";
import { logger } from "@/utils/logger";

const log = logger.scoped("VersionUpdateModal");

interface VersionUpdateModalProps {
  visible: boolean;
  storeUrl: string;
}

export const VersionUpdateModal: React.FC<VersionUpdateModalProps> = ({
  visible,
  storeUrl,
}) => {
  const handleUpdate = () => {
    Linking.openURL(storeUrl).catch((err) =>
      log.error("Error al abrir la tienda:", err)
    );
  };

  // Update forzada: el usuario no puede cerrar el modal sin actualizar.
  const noop = () => {};

  return (
    <Modal
      visible={visible}
      onClose={noop}
      variant="center"
      showCloseButton={false}
      dismissOnBackdropPress={false}
      contentStyle={styles.content}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="refresh-circle" size={80} color={COLORS.primary} />
      </View>

      <Text style={styles.title}>Actualización disponible</Text>
      <Text style={styles.message}>
        Hay una nueva versión de Ilyrox disponible. Por favor, actualiza la aplicación para continuar disfrutando de todas las funciones.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleUpdate}>
        <Text style={styles.buttonText}>Actualizar ahora</Text>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 30,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 15,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "600",
  },
});
