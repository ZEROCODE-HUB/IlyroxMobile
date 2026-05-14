import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { Property } from "@/types";
import { Bath } from "lucide-react-native";

interface PropertyMapCardProps {
  id: string;
  property: Property;
  price: number;
  currency?: string;
  image: string;
  isHighlighted?: boolean;
  onPress: () => void;
}

export const PropertyMapCard: React.FC<PropertyMapCardProps> = ({
  id,
  property,
  price,
  currency = "MXN",
  image,
  isHighlighted = false,
  onPress,
}) => {
  const formatPrice = () => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    }
    return `${(price / 1000).toFixed(0)}K`;
  };

  const currencyLabel = currency === "USD" ? "USD" : "MXN";

  return (
    <TouchableOpacity
      style={[styles.card, isHighlighted && styles.cardHighlighted]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />

        <View style={styles.priceTag}>
          <Text style={styles.priceText}>
            {currencyLabel} {formatPrice()}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.title}>
            {property.title}
          </Text>
        </View>
        <View style={styles.statsRow}>
          {(property.features?.beds || property.habitaciones) ? (
            <View style={styles.statItem}>
              <Ionicons name="bed-outline" size={14} color={COLORS.textTertiary} />
              <Text style={styles.statValue}>
                {property.features?.beds || property.habitaciones}
              </Text>
            </View>
          ) : null}

          {(property.features?.baths || property.banos) ? (
            <View style={styles.statItem}>
              <Bath size={12} color={COLORS.textTertiary} />
              <Text style={styles.statValue}>
                {property.features?.baths || property.banos}
              </Text>
            </View>
          ) : null}

          {(property.features?.parking !== undefined || property.estacionamientos !== undefined) ? (
            <View style={styles.statItem}>
              <Ionicons name="car-outline" size={14} color={COLORS.textTertiary} />
              <Text style={styles.statValue}>
                {property.features?.parking ?? property.estacionamientos}
              </Text>
            </View>
          ) : null}

          {(property.features?.constructionSqft || property.metros_construccion) ? (
            <View style={styles.statItem}>
              <Ionicons name="home-outline" size={14} color={COLORS.textTertiary} />
              <Text style={styles.statValue}>
                {property.features?.constructionSqft || property.metros_construccion}m²
              </Text>
            </View>
          ) : null}

          {(property.features?.landSqft || property.metros_terreno) ? (
            <View style={[styles.statItem, { borderRightWidth: 0 }]}>
              <Ionicons name="resize-outline" size={14} color={COLORS.textTertiary} />
              <Text style={styles.statValue}>
                {property.features?.landSqft || property.metros_terreno}m²
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {isHighlighted && (
        <View style={styles.highlightIndicator}>
          <Ionicons name="location" size={16} color={COLORS.white} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 200,
    height: 230,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginRight: 12,
    overflow: "hidden",
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cardHighlighted: {
    borderColor: COLORS.primary,
    elevation: 6,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    transform: [{ scale: 1.02 }],
  },
  image: {
    width: "100%",
    height: 110,
    backgroundColor: COLORS.background,
  },
  priceTag: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  priceText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  info: {
    padding: 12,
    minHeight: 60,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  highlightIndicator: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
});
