import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import {
  TIPOS_UBICACION_INDUSTRIAL,
  ALTURAS_LIBRES,
  TIPOS_ENERGIA_KVA,
} from "@/constants/propertyData";
import { AppInput } from "@/design-system/components/AppInput";
import RadioGroupSelector from "@/components/common/RadioGroupSelector";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";

export const IndustrialFiltersSection: React.FC = () => {
  const { filters, updateIndustrialFilter } = usePropertyFiltersStore();
  const inf = filters.industrialFilters;

  const toggleEnergiaKva = (tipo: string) => {
    const current = inf.energiaKva ?? [];
    const updated = current.includes(tipo)
      ? current.filter((t) => t !== tipo)
      : [...current, tipo];
    updateIndustrialFilter("energiaKva", updated);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Características Industriales</Text>

      {/* UBICACIÓN */}
      <RadioGroupSelector
        label="Ubicación"
        options={[...TIPOS_UBICACION_INDUSTRIAL]}
        selectedValue={inf.ubicacion}
        onSelect={(v) => updateIndustrialFilter("ubicacion", v === inf.ubicacion ? "" : v)}
      />

      {/* ALTURA LIBRE */}
      <Text style={styles.label}>Altura Libre Operativa</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {ALTURAS_LIBRES.map((altura) => {
          const selected = inf.alturaLibre === altura;
          return (
            <TouchableOpacity
              key={altura}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => updateIndustrialFilter("alturaLibre", selected ? "" : altura)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{altura}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* TIPO DE ENERGÍA */}
      <Text style={styles.label}>Tipo de Energía (kVA)</Text>
      <View style={styles.chipsWrap}>
        {TIPOS_ENERGIA_KVA.map((tipo) => {
          const selected = inf.energiaKva?.includes(tipo);
          return (
            <TouchableOpacity
              key={tipo}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleEnergiaKva(tipo)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tipo}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ÁREA MÍNIMA DE OFICINAS Y PATIO DE MANIOBRAS */}
      <View style={styles.row}>
        <View style={styles.half}>
          <AppInput
            label="Área Ofic. mín. (m²)"
            placeholder="Opcional"
            keyboardType="decimal-pad"
            value={inf.areaOficinasMin}
            onChangeText={(v) => updateIndustrialFilter("areaOficinasMin", v)}
          />
        </View>
        <View style={styles.half}>
          <AppInput
            label="Patio Maniob. mín. (m²)"
            placeholder="Opcional"
            keyboardType="decimal-pad"
            value={inf.patioManiobrasMin}
            onChangeText={(v) => updateIndustrialFilter("patioManiobrasMin", v)}
          />
        </View>
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
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  chipsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginRight: 8,
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  half: {
    flex: 1,
  },
});
