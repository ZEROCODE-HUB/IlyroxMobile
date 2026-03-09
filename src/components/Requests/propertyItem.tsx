import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, Pressable, View } from "react-native";
import { COLORS } from "@/constants/colors";
import * as Clipboard from "expo-clipboard";
import firstUpperCase from "@/utils/firstUpperCase";

interface PropertyItemProps {
  item: any;
  handleContactWpp: (phone: string) => void;
  formatCompactPrice: (amount: number) => string;
  handleContactPhone: (phone: string) => void;
  showToast: (
    message: string,
    type: "success" | "error" | "info" | "warning",
  ) => void;
}

export const PropertyItem = ({
  item,
  handleContactWpp,
  formatCompactPrice,
  handleContactPhone,
  showToast,
}: PropertyItemProps) => {
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

  const nameInitial = (item.nombre_completo || item.nombre || "U")
    .charAt(0)
    .toUpperCase();

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
                {item.nombre_completo || item.nombre || "Interesado"}
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

      <View style={styles.requestSummary}>
        <View style={styles.summaryRow}>
          <Ionicons
            name="business-outline"
            size={16}
            color={COLORS.textTertiary}
          />
          <Text style={styles.summaryTitle}>
            Buscando: {firstUpperCase(item.tipo) || "No especificado"}
          </Text>
        </View>

        {(item.rango_min !== undefined || item.rango_max !== undefined) && (
          <View style={styles.summaryRow}>
            <Ionicons
              name="cash-outline"
              size={16}
              color={COLORS.textTertiary}
            />
            <Text style={styles.summaryTitle}>
              Presupuesto: MXN{" "}
              {`${formatCompactPrice(item.rango_min || 0)} - ${formatCompactPrice(item.rango_max || 0)}`}
            </Text>
          </View>
        )}

        <View style={styles.tagContainer}>
          {item.presupuesto_min !== undefined && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                Min: {formatCompactPrice(item.presupuesto_min)}
              </Text>
            </View>
          )}
          {item.presupuesto_max !== undefined && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                Max: {formatCompactPrice(item.presupuesto_max)}
              </Text>
            </View>
          )}
        </View>

        {(item.estado || item.ciudad || item.colonia) && (
          <View style={styles.locationInfo}>
            <Ionicons
              name="location-outline"
              size={14}
              color={COLORS.textTertiary}
            />
            <Text style={styles.locationText}>
              {[item.estado, item.ciudad, item.colonia]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
        )}
      </View>

      {item.descripcion && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{item.descripcion}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
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
  requestSummary: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
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
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: COLORS.primary + "10",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  locationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  messageBox: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    fontStyle: "italic",
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
});
