import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { AMENIDADES } from "@/constants/propertyData";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";

/**
 * Filtro de amenidades para el buscador. Selección múltiple: la propiedad debe
 * tener TODAS las amenidades seleccionadas (ver usePropertyFilters).
 */
export const AmenitiesFilterSection: React.FC = () => {
  const { filters, updateFilter } = usePropertyFiltersStore();
  const selected = filters.amenidades;

  const toggle = (amenidad: string) => {
    updateFilter(
      "amenidades",
      selected.includes(amenidad)
        ? selected.filter((a) => a !== amenidad)
        : [...selected, amenidad],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Amenidades</Text>
      <View style={styles.chipsWrap}>
        {AMENIDADES.map((amenidad) => {
          const isSelected = selected.includes(amenidad);
          return (
            <TouchableOpacity
              key={amenidad}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(amenidad)}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
              >
                {amenidad}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: COLORS.white,
  },
});
