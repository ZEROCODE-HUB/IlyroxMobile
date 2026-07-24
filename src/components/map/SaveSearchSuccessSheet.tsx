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
  return (
    <AppBottomSheet visible={visible} onClose={onDismiss}>
      <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Hero: megáfono sobre fondo teal claro */}
          <View style={styles.heroWrap}>
            <Ionicons
              name="megaphone"
              size={50}
              color={COLORS.primary}
              style={styles.heroMegaphone}
            />
            <Ionicons
              name="people"
              size={24}
              color={COLORS.primary}
              style={styles.heroPeople}
            />
          </View>

          {/* Título principal */}
          <Text style={styles.title}>
            ILYROX seguirá buscando propiedades automáticamente para ti.
          </Text>

          {/* Card: otros asesores también pueden ayudar */}
          <View style={styles.asesoresCard}>
            <View style={styles.asesoresIconWrap}>
              <Ionicons name="people-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.asesoresTitle}>
                Otros asesores también pueden ayudarte a encontrar propiedades similares.
              </Text>
              <Text style={styles.asesoresSub}>
                Al compartir tu búsqueda, más asesores podrán enviarte opciones que se ajusten a lo que necesitas.
              </Text>
            </View>
          </View>

          {/* Botón principal */}
          <TouchableOpacity style={styles.publishBtn} onPress={onPublish} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
            <Text style={styles.publishBtnText}>Publicar lo que estoy buscando</Text>
          </TouchableOpacity>

          {/* Divisor "o" */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissBtnText}>Solo guardar búsqueda</Text>
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
  heroWrap: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: COLORS.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 22,
  },
  heroMegaphone: {
    transform: [{ translateX: -8 }, { translateY: -8 }],
  },
  heroPeople: {
    position: "absolute",
    bottom: 22,
    right: 20,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.textPrimary,
    lineHeight: 28,
    marginBottom: 18,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  asesoresCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    width: "100%",
    backgroundColor: COLORS.primary + "0E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  asesoresIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  asesoresTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    lineHeight: 19,
    marginBottom: 5,
  },
  asesoresSub: {
    fontSize: 12.5,
    fontWeight: "400",
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    width: "100%",
    marginBottom: 6,
  },
  publishBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.cardBorder,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textTertiary,
  },
  dismissBtn: {
    paddingVertical: 12,
    width: "100%",
    alignItems: "center",
  },
  dismissBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
});
