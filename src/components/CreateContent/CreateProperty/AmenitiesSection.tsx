// ============================================
// AmenitiesSection - Sección de amenidades
// ============================================

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { AMENIDADES } from "../../../constants/propertyData";
import { usePropertyFormContext } from "./PropertyFormContext";

export const AmenitiesSection = React.memo(function AmenitiesSection() {
  const { amenidadesSeleccionadas, toggleAmenidad } = usePropertyFormContext();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderBand}>
        <Ionicons name="star-outline" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitleBand}>Amenidades</Text>
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
  sectionHeaderBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary + "12",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  sectionTitleBand: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
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
