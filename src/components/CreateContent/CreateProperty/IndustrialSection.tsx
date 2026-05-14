import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import {
  TIPOS_UBICACION_INDUSTRIAL,
  ALTURAS_LIBRES,
  TIPOS_ENERGIA_KVA,
} from "../../../constants/propertyData";
import { AppInput } from "../../../design-system/components/AppInput";
import RadioGroupSelector from "../../common/RadioGroupSelector";
import { usePropertyFormContext } from "./PropertyFormContext";

export const IndustrialSection = React.memo(function IndustrialSection() {
  const {
    ubicacionIndustrial,
    setUbicacionIndustrial,
    alturaLibreM,
    setAlturaLibreM,
    tipoEnergiaKva,
    toggleTipoEnergiaKva,
    areaOficinas,
    setAreaOficinas,
    patioManiobras,
    setPatioManiobras,
  } = usePropertyFormContext();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderBand}>
        <Ionicons name="business-outline" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitleBand}>Características Industriales</Text>
      </View>

      {/* UBICACIÓN INDUSTRIAL */}
      <RadioGroupSelector
        label="Ubicación"
        options={[...TIPOS_UBICACION_INDUSTRIAL]}
        selectedValue={ubicacionIndustrial}
        onSelect={setUbicacionIndustrial}
      />

      {/* ALTURA LIBRE — single select chips */}
      <Text style={styles.label}>Altura Libre Operativa</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {ALTURAS_LIBRES.map((altura) => {
          const selected = alturaLibreM === altura;
          return (
            <TouchableOpacity
              key={altura}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setAlturaLibreM(selected ? '' : altura)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {altura}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* TIPO DE ENERGÍA — multi select chips */}
      <Text style={styles.label}>Tipo de Energía (kVA)</Text>
      <View style={styles.chipsWrap}>
        {TIPOS_ENERGIA_KVA.map((tipo) => {
          const selected = tipoEnergiaKva.includes(tipo);
          return (
            <TouchableOpacity
              key={tipo}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleTipoEnergiaKva(tipo)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {tipo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ÁREA DE OFICINAS Y PATIO DE MANIOBRAS */}
      <View style={styles.row}>
        <View style={styles.half}>
          <AppInput
            label="Área de Oficinas (m²)"
            placeholder="Opcional"
            keyboardType="decimal-pad"
            value={areaOficinas}
            onChangeText={setAreaOficinas}
          />
        </View>
        <View style={styles.half}>
          <AppInput
            label="Patio de Maniobras (m²)"
            placeholder="Opcional"
            keyboardType="decimal-pad"
            value={patioManiobras}
            onChangeText={setPatioManiobras}
          />
        </View>
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
