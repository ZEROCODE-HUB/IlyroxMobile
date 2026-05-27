import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../constants";

interface LeadMatchCardProps {
  leadName: string;
  leadPhone?: string;
  matchCount: number;
  similarCount: number;
  minPrice: number;
  maxPrice: number;
  currency: string;
  onPress: () => void;
}

export const LeadMatchCard: React.FC<LeadMatchCardProps> = ({
  leadName,
  leadPhone,
  matchCount,
  similarCount,
  minPrice,
  maxPrice,
  currency,
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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left: Split Pill */}

      {/* Middle: Info */}
      <View style={styles.infoContainer}>
        <View style={styles.leadRow}>
          <Text style={styles.leadName} numberOfLines={1}>
            {leadName}
          </Text>
          <Text style={styles.leadPhone} numberOfLines={1}>
            {leadPhone}
          </Text>
        </View>
        <Text style={styles.priceRange}>
          {formatCompactPrice(minPrice)} - {formatCompactPrice(maxPrice)}{" "}
          {currencyDisplay}
        </Text>
      </View>

      {/* Right: Total count pill */}
      <View style={styles.pillWrapper}>
        <View style={styles.totalPill}>
          <Text style={styles.totalPillText}>{matchCount + similarCount}</Text>
          <Text style={styles.totalPillLabel}> props</Text>
        </View>
        {(matchCount > 0 || similarCount > 0) && (
          <Text style={styles.pillBreakdown}>
            {matchCount} exactas · {similarCount} similares
          </Text>
        )}
      </View>
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
  pillWrapper: {
    alignItems: "center",
    marginRight: 4,
  },
  totalPill: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  totalPillText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  totalPillLabel: {
    color: COLORS.whiteTransparent80,
    fontSize: 11,
    fontWeight: "500",
  },
  pillBreakdown: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 3,
    textAlign: "center",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  leadRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  leadName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary || "#000",
  },
  leadPhone: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: "500",
    color: "#505050ff",
  },
  priceRange: {
    fontSize: 14,
    color: COLORS.textSecondary || "#666",
    fontWeight: "500",
  },
  phoneContainer: {
    marginLeft: 8,
    justifyContent: "center",
  },
  phoneText: {
    fontSize: 14,
    color: COLORS.textSecondary || "#666",
  },
});
