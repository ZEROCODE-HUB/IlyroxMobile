import React from "react";
import {
  Modal as RNModal,
  ModalProps as RNModalProps,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { X } from "lucide-react-native";
import { COLORS } from "@/constants/colors";

export type ModalVariant = "center" | "bottom" | "fullscreen";

export interface ModalProps
  extends Omit<RNModalProps, "children" | "animationType" | "visible"> {
  visible: boolean;
  onClose: () => void;
  variant?: ModalVariant;
  title?: string;
  showCloseButton?: boolean;
  dismissOnBackdropPress?: boolean;
  children: React.ReactNode;
  contentStyle?: ViewStyle | ViewStyle[];
  headerRight?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  variant = "center",
  title,
  showCloseButton = true,
  dismissOnBackdropPress = true,
  children,
  contentStyle,
  headerRight,
  transparent = true,
  statusBarTranslucent = true,
  ...rest
}) => {
  const animationType = variant === "bottom" ? "slide" : "fade";
  const contentFlat = Array.isArray(contentStyle)
    ? Object.assign({}, ...contentStyle)
    : contentStyle;

  const body = (
    <Pressable
      style={[styles.backdrop, styles[variant]]}
      onPress={dismissOnBackdropPress ? onClose : undefined}
    >
      <Pressable
        onPress={(e) => e.stopPropagation()}
        style={[styles.content, styles[`${variant}Content`], contentFlat]}
      >
        {(title || showCloseButton || headerRight) && (
          <View style={styles.header}>
            {title ? (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <View style={styles.headerActions}>
              {headerRight}
              {showCloseButton && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  onPress={onClose}
                  hitSlop={8}
                  style={styles.closeButton}
                >
                  <X size={20} color={COLORS.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        )}
        {children}
      </Pressable>
    </Pressable>
  );

  return (
    <RNModal
      visible={visible}
      transparent={transparent}
      animationType={animationType}
      statusBarTranslucent={statusBarTranslucent}
      onRequestClose={onClose}
      {...rest}
    >
      {/* La variante `center` lleva su contenido (input + botones) centrado
          verticalmente; sin avoidance, el teclado tapa el pie del modal (los
          botones Cancelar/Guardar quedan cortados). El KeyboardAvoidingView
          empuja el modal hacia arriba al abrir el teclado. Solo se aplica a
          `center`: `bottom`/`fullscreen` gestionan el teclado por su cuenta. */}
      {variant === "center" ? (
        <KeyboardAvoidingView
          style={styles.avoider}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </RNModal>
  );
};

const styles = StyleSheet.create({
  avoider: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  bottom: {
    justifyContent: "flex-end",
  },
  fullscreen: {
    padding: 0,
  },
  content: {
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  centerContent: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 12,
  },
  bottomContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  fullscreenContent: {
    flex: 1,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeButton: {
    padding: 4,
    borderRadius: 9999,
  },
});
