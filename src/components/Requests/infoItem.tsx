import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  Pressable,
  View,
  Linking,
  Alert,
} from "react-native";
import { COLORS } from "@/constants/colors";
import firstUpperCase from "@/utils/firstUpperCase";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";

interface InfoItemProps {
  item: any;
  handleContactWpp: (phone: string) => void;
  handleContactPhone: (phone: string) => void;
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning",
  ) => void;
}

export const InfoItem = ({
  item,
  handleContactWpp,
  handleContactPhone,
  showToast,
}: InfoItemProps) => {
  if (!item) return null;

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "Fecha no disponible";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Fecha inválida";
      return date.toLocaleDateString();
    } catch (e) {
      return "Error en fecha";
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showToast(`${label} copiado`, "success");
  };

  const titulo = `${firstUpperCase(item.propiedad?.tipo)} en ${item.propiedad?.municipio}`;
  const nameInitial = (item.nombre || "U").charAt(0).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{nameInitial}</Text>
          </View>
          <View style={styles.userDetails}>
            <View style={styles.namePhoneRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.nombre || "Interesado"}
              </Text>
              {item.telefono && (
                <Pressable
                  onPress={() => copyToClipboard(item.telefono, "Teléfono")}
                  style={styles.phoneBadge}
                >
                  <Ionicons
                    name="copy-outline"
                    size={10}
                    color={COLORS.primary}
                  />
                  <Text style={styles.phoneBadgeText}> {item.telefono}</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.userSubtitle} numberOfLines={1}>
              {item.email || "Sin email"}
            </Text>
          </View>
        </View>
        <View style={styles.sectionIcons}>
          <Pressable
            style={({ pressed }) => [
              styles.phoneBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => handleContactPhone(item.telefono)}
          >
            <Ionicons name="call-outline" size={20} color={COLORS.white} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.whatsappBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => handleContactWpp(item.telefono)}
          >
            <Ionicons name="logo-whatsapp" size={20} color={COLORS.white} />
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.propertyInfo}>
        <Ionicons name="home-outline" size={14} color={COLORS.textTertiary} />
        <Text style={styles.propertyTitle} numberOfLines={1}>
          {titulo || "Propiedad no especificada"}
        </Text>
        {item.propiedad?.id && (
          <Pressable
            onPress={() =>
              copyToClipboard(item.propiedad.codigo_propiedad, "Código")
            }
            style={styles.propertyCode}
          >
            <Ionicons name="copy-outline" size={10} color={COLORS.primary} />
            <Text style={styles.codeText}>
              {" "}
              {item.propiedad.codigo_propiedad ||
                String(item.propiedad.id).split("-")[0]}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.sectionMessageImage}>
        <View style={styles.messageBox}>
          {item.mensaje ? (
            <Text style={styles.messageText}>{item.mensaje}</Text>
          ) : (
            <Text style={styles.noMessageText}>Sin mensaje adicional</Text>
          )}
        </View>

        <Image
          source={item.propiedad?.fotos[0]}
          style={styles.fotoPropiedad}
          contentFit="cover"
        />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        {item.propiedad_id && (
          <Pressable
            onPress={() =>
              router.push(`/(stack)/property/${item.propiedad_id}`)
            }
          >
            <Text style={styles.viewDetailLink}>Ver propiedad</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  userDetails: {
    flex: 1,
  },
  namePhoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    maxWidth: "60%",
  },
  phoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "10",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  phoneBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  userSubtitle: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  sectionIcons: {
    flexDirection: "row",
    gap: 8,
  },
  phoneBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2568d3",
    justifyContent: "center",
    alignItems: "center",
  },
  whatsappBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#25D366",
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.background,
    marginVertical: 12,
  },
  propertyInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  propertyTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  propertyCode: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary + "10",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  codeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: "700",
  },
  sectionMessageImage: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  messageBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    minHeight: 80,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    fontStyle: "italic",
  },
  noMessageText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontStyle: "italic",
  },
  fotoPropiedad: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  viewDetailLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "700",
  },
});
