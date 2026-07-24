import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  Pressable,
  View,
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

  const getTimeAgo = (dateString: string) => {
    try {
      const diff = Date.now() - new Date(dateString).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Ahora";
      if (mins < 60) return `Hace ${mins} min`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? "s" : ""}`;
      const days = Math.floor(hrs / 24);
      return `Hace ${days} día${days > 1 ? "s" : ""}`;
    } catch {
      return "";
    }
  };

  const titulo = `${firstUpperCase(item.propiedad?.tipo)} en ${item.propiedad?.municipio}`;
  const nameInitial = (item.nombre || "U").charAt(0).toUpperCase();
  const isNew = !item.leido;

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
            <View style={styles.statusRow}>
              {isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>Nuevo</Text>
                </View>
              )}
              <Text style={styles.timeAgo}>
                {isNew ? " • " : ""}{getTimeAgo(item.created_at)}
              </Text>
            </View>
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

      <View style={styles.fieldsWithPhoto}>
        <View style={styles.fieldsColumn}>
          <View style={styles.fieldRow}>
            <Ionicons name="home-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.fieldLabel}>Interesado en: </Text>
            <Text style={styles.fieldValue} numberOfLines={1}>
              {titulo || "Propiedad no especificada"}
            </Text>
            {item.propiedad?.telefono && (
              <Pressable
                onPress={() =>
                  copyToClipboard(item.propiedad.telefono, "Teléfono")
                }
                style={styles.phoneBadge}
              >
                <Ionicons name="copy-outline" size={10} color={COLORS.primary} />
                <Text style={styles.phoneBadgeText}>
                  {" "}
                  {item.propiedad.telefono}
                </Text>
              </Pressable>
            )}
          </View>

          {(item.presupuesto_min != null || item.presupuesto_max != null) && (
            <View style={styles.fieldRow}>
              <Ionicons
                name="cash-outline"
                size={14}
                color={COLORS.textTertiary}
              />
              <Text style={styles.fieldLabel}>Presupuesto: </Text>
              <Text style={styles.fieldValue}>
                ${item.presupuesto_min ?? 1} - ${item.presupuesto_max != null
                  ? Number(item.presupuesto_max) >= 1000000
                    ? `${(item.presupuesto_max / 1000000).toFixed(1).replace(/\.0$/, "")}M`
                    : item.presupuesto_max
                  : "N/A"}
              </Text>
            </View>
          )}

          {item.plazo && (
            <View style={styles.fieldRow}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={COLORS.textTertiary}
              />
              <Text style={styles.fieldLabel}>Plazo: </Text>
              <Text style={styles.fieldValue}>{item.plazo}</Text>
            </View>
          )}

          <View style={styles.fieldRow}>
            <Ionicons
              name="chatbubble-outline"
              size={14}
              color={COLORS.textTertiary}
            />
            <Text style={styles.fieldLabel}>Comentarios: </Text>
            <Text style={[styles.fieldValue, styles.fieldValueItalic]} numberOfLines={2}>
              {item.mensaje || "Sin comentarios adicionales"}
            </Text>
          </View>
        </View>

        {item.propiedad?.fotos?.[0] && (
          <Image
            source={item.propiedad.fotos[0]}
            style={styles.fotoPropiedad}
            contentFit="cover"
          />
        )}
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 2,
  },
  newBadge: {
    backgroundColor: "#25D366",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
  },
  timeAgo: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  fieldsWithPhoto: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  fieldsColumn: {
    flex: 1,
    gap: 8,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  fieldValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  fieldValueItalic: {
    fontStyle: "italic",
    color: COLORS.textTertiary,
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
