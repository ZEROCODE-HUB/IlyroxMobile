import React from "react";
import { Modal, View, Pressable, StyleSheet } from "react-native";
import { COLORS } from "../../constants";

interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  statusBarTranslucent?: boolean;
}

/**
 * Bottom sheet basado en UN SOLO <Modal> nativo.
 *
 * Antes se usaban dos <Modal> simultáneos (backdrop con fade + contenido con
 * slide). En iOS cada Modal es una presentación de UIViewController y presentar
 * o cerrar dos a la vez provoca la race "Attempt to present ... while a
 * presentation is in progress", que de forma no determinista dejaba un modal
 * fantasma transparente capturando los toques y bloqueaba los botones de la
 * pantalla (p. ej. Iniciar Sesión / Registrarse). Con un único Modal la race
 * desaparece.
 */
export function AppBottomSheet({
  visible,
  onClose,
  children,
  statusBarTranslucent,
}: AppBottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent={statusBarTranslucent}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop a pantalla completa, DETRÁS del contenido: los toques sobre
            el contenido los recibe el contenido; los de la zona vacía cierran. */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
});
