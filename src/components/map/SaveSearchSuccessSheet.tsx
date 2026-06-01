import React from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { AppBottomSheet } from "@/design-system/components/AppBottomSheet";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";

interface SaveSearchSuccessSheetProps {
  visible: boolean;
  onPublish: () => void;
  onDismiss: () => void;
}

export const SaveSearchSuccessSheet: React.FC<SaveSearchSuccessSheetProps> = ({
  visible,
  onPublish,
  onDismiss,
}) => {
  const { filters } = usePropertyFiltersStore();

  const pills: string[] = [];
  if (filters.operacion) {
    pills.push(filters.operacion.charAt(0).toUpperCase() + filters.operacion.slice(1));
  }
  if (filters.tipoPropiedad) {
    const t = filters.tipoPropiedad.charAt(0).toUpperCase() + filters.tipoPropiedad.slice(1);
    if (filters.subtipo?.length > 0) {
      pills.push(`${t}: ${filters.subtipo.join(", ")}`);
    } else {
      pills.push(t);
    }
  }
  if (filters.precioMin || filters.precioMax) {
    const min = filters.precioMin || "0";
    const max = filters.precioMax || "Sin límite";
    pills.push(`${filters.moneda ?? "MXN"} ${min} – ${max}`);
  }
  const loc = filters.locationFilter;
  if (loc?.municipio) pills.push(loc.municipio);
  else if (loc?.ciudad) pills.push(loc.ciudad);
  else if (loc?.estado) pills.push(loc.estado);
  if (filters.locationChips?.length > 0) {
    filters.locationChips.forEach((c: any) => pills.push(c.label));
  }

  return (
    <AppBottomSheet visible={visible} onClose={onDismiss}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Ícono de éxito */}
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={60} color={COLORS.success ?? "#22c55e"} />
          </View>

          <Text style={styles.title}>¡Búsqueda guardada!</Text>

          {/* Mensaje de notificación */}
          <View style={styles.noticeRow}>
            <Ionicons name="notifications-outline" size={18} color={COLORS.primary} />
            <Text style={styles.noticeText}>
              Te avisaremos cuando un asesor publique una propiedad que haga match con estos criterios.
            </Text>
          </View>

          {/* Filtros activos */}
          {pills.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              {pills.map((pill, i) => (
                <View key={i} style={styles.pill}>
                  <Text style={styles.pillText}>{pill}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Botones */}
          <TouchableOpacity style={styles.publishBtn} onPress={onPublish} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
            <Text style={styles.publishBtnText}>Publicar en el feed</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissBtnText}>Listo</Text>
          </TouchableOpacity>
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
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
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
    marginBottom: 12,
    textAlign: "center",
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: COLORS.primary + "10",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 18,
    fontWeight: "500",
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
    marginBottom: 20,
  },
  pill: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primaryLight ?? COLORS.primary + "40",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  publishBtn: {
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
  publishBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
  dismissBtn: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  dismissBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});
