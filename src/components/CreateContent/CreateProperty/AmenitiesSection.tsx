// ============================================
// AmenitiesSection - Sección de amenidades
// ============================================

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { AMENIDADES } from "../../../constants/propertyData";

interface AmenitiesSectionProps {
  amenidadesSeleccionadas: string[];
  toggleAmenidad: (amenidad: string) => void;
}

export const AmenitiesSection = React.memo(function AmenitiesSection({
  amenidadesSeleccionadas,
  toggleAmenidad,
}: AmenitiesSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="star" size={24} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Amenidades</Text>
      </View>

      <View style={styles.amenidadesGrid}>
        {AMENIDADES.map((amenidad) => (
          <TouchableOpacity
            key={amenidad}
            style={[
              styles.amenidadChip,
              amenidadesSeleccionadas.includes(amenidad) &&
                styles.amenidadChipActive,
            ]}
            onPress={() => toggleAmenidad(amenidad)}
          >
            <Text
              style={[
                styles.amenidadText,
                amenidadesSeleccionadas.includes(amenidad) &&
                  styles.amenidadTextActive,
              ]}
            >
              {amenidad}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  amenidadesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenidadChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    gap: 6,
  },
  amenidadChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTransparent,
  },
  amenidadText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  amenidadTextActive: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
