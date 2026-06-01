import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { COLORS } from "../../constants";

interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  statusBarTranslucent?: boolean;
}

export function AppBottomSheet({
  visible,
  onClose,
  children,
  statusBarTranslucent,
}: AppBottomSheetProps) {
  return (
    <>
      {/* Modal 1: backdrop con fade progresivo */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent={statusBarTranslucent}
        onRequestClose={onClose}
      >
        <View style={styles.backdrop} pointerEvents="none" />
      </Modal>

      {/* Modal 2: contenido con slide nativo (manejo de teclado correcto) */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent={statusBarTranslucent}
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={styles.touchArea} />
          </TouchableWithoutFeedback>
          {children}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  touchArea: {
    flex: 1,
  },
});
