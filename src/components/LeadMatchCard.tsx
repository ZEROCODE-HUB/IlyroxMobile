import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants";

interface LeadMatchCardProps {
  leadName: string;
  leadPhone?: string;
  matchCount: number;
  similarCount: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
  latestMatchDate?: string;
  onPress: () => void;
}

/** Tiempo relativo legible: "hace un momento" / "hace N min" / "hace N h" / "hace N días". */
const formatRelative = (dateStr?: string): string => {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
};

export const LeadMatchCard: React.FC<LeadMatchCardProps> = ({
  leadName,
  leadPhone,
  matchCount,
  similarCount,
  minPrice,
  maxPrice,
  currency,
  latestMatchDate,
  onPress,
}) => {
  const formatCompactPrice = (amount: number) => {
    if (!amount) return "0";
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}k`;
    }
    return `$${amount}k`;
  };

  const currencyDisplay = currency === "USD" ? "USD" : "MXN";
  const hasNew = matchCount + similarCount > 0;
  const statusText = hasNew
    ? `Última coincidencia ${formatRelative(latestMatchDate)}`.trim()
    : "Sin nuevas coincidencias";

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Info */}
      <View style={styles.infoContainer}>
        <View style={styles.leadRow}>
          <Text style={styles.leadName} numberOfLines={1}>
            {leadName}
          </Text>
          {!!leadPhone && (
            <View style={styles.phoneWrapper}>
              <Ionicons
                name="call-outline"
                size={12}
                color={COLORS.textSecondary}
              />
              <Text style={styles.leadPhone} numberOfLines={1}>
                {leadPhone}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.priceRange}>
          {formatCompactPrice(minPrice)} - {formatCompactPrice(maxPrice)}{" "}
          {currencyDisplay}
        </Text>

        <View style={styles.statusRow}>
          <Ionicons name="time-outline" size={13} color={COLORS.textTertiary} />
          <Text style={styles.statusText} numberOfLines={1}>
            {statusText}
          </Text>
        </View>
      </View>

      {/* Badge: Matches | Similares */}
      <View style={styles.badge}>
        <View style={styles.badgeCol}>
          <Text style={styles.badgeNumber}>{matchCount}</Text>
          <Text style={styles.badgeLabel}>Matches</Text>
        </View>
        <View style={styles.badgeDivider} />
        <View style={styles.badgeCol}>
          <Text style={styles.badgeNumber}>{similarCount}</Text>
          <Text style={styles.badgeLabel}>Similares</Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={COLORS.textTertiary}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder || COLORS.mediumGray,
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  leadRow: {
    flexDirection: "row",
    alignItems: "center",
    // En letra grande, si nombre + teléfono no caben en una línea, el teléfono
    // baja a la siguiente (completo) en vez de comprimir el nombre hasta ocultarlo.
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 2,
    marginBottom: 4,
  },
  leadName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary || "#000",
  },
  phoneWrapper: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  leadPhone: {
    marginLeft: 4,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  priceRange: {
    fontSize: 14,
    color: COLORS.textSecondary || "#666",
    fontWeight: "500",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusText: {
    flexShrink: 1,
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successLight,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 10,
  },
  badgeCol: {
    alignItems: "center",
    minWidth: 48,
  },
  badgeNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  badgeDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 10,
  },
  chevron: {
    marginLeft: 6,
  },
});
