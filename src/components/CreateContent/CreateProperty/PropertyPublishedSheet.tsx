/**
 * PropertyPublishedSheet
 *
 * Bottom sheet de éxito tras publicar o actualizar una propiedad.
 * Misma estética que SaveSearchSuccessSheet del flujo de búsqueda.
 */
import React from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { AppBottomSheet } from "@/design-system/components/AppBottomSheet";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";

interface PropertyPublishedSheetProps {
  visible: boolean;
  /** true = edición, false = nueva publicación */
  isUpdate: boolean;
  /** ID de la propiedad nueva (solo cuando isUpdate=false) */
  newPropertyId: string | null;
  /** Si se pasa, se muestra el botón "Crear Open House" */
  onCreateOpenHouse?: () => void;
  onViewProperty: () => void;
  onDismiss: () => void;
}

export const PropertyPublishedSheet: React.FC<PropertyPublishedSheetProps> = ({
  visible,
  isUpdate,
  newPropertyId,
  onCreateOpenHouse,
  onViewProperty,
  onDismiss,
}) => {
  return (
    <AppBottomSheet visible={visible} onClose={onDismiss}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Ícono */}
          <View style={styles.iconWrap}>
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={COLORS.success ?? "#22c55e"}
            />
          </View>

          <Text style={styles.title}>
            {isUpdate ? "¡Propiedad actualizada!" : "¡Propiedad publicada!"}
          </Text>

          <Text style={styles.subtitle}>
            {isUpdate
              ? "Los cambios se guardaron correctamente."
              : "Tu propiedad ya está visible en el feed y en el mapa."}
          </Text>

          {/* Botón principal: Ver propiedad */}
          {newPropertyId && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onViewProperty}
              activeOpacity={0.85}
            >
              <Ionicons name="eye-outline" size={20} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>Ver propiedad</Text>
            </TouchableOpacity>
          )}

          {/* Botón Open House (solo si aplica) */}
          {!isUpdate && onCreateOpenHouse && (
            <TouchableOpacity
              style={styles.openHouseBtn}
              onPress={onCreateOpenHouse}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={styles.openHouseBtnText}>Crear Open House</Text>
            </TouchableOpacity>
          )}

          {/* Botón secundario: solo en edición ("Listo"). En publicación nueva,
              "Ver propiedad" ya lleva al feed con la propiedad hasta arriba. */}
          {isUpdate && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Listo</Text>
            </TouchableOpacity>
          )}
      </Pressable>
    </AppBottomSheet>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
    paddingTop: 12,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  iconWrap: {
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    width: "100%",
    marginBottom: 10,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
  openHouseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 14,
    width: "100%",
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  openHouseBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  secondaryBtn: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});
