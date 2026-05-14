import React from "react";
import { View, Text, Switch, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { TIPOS_AGUA, USOS_TERRENO, TIPOS_RIEGO } from "@/constants/propertyData";
import RadioGroupSelector from "@/components/common/RadioGroupSelector";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";

export const AgricolaFiltersSection: React.FC = () => {
  const { filters, updateAgricolaFilter } = usePropertyFiltersStore();
  const ag = filters.agricolaFilters;

  const toggleTipoAgua = (tipo: string) => {
    const current = ag.tiposAgua ?? [];
    const updated = current.includes(tipo)
      ? current.filter((t) => t !== tipo)
      : [...current, tipo];
    updateAgricolaFilter("tiposAgua", updated);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Características Agrícolas</Text>

      {/* TIPO DE AGUA */}
      <Text style={styles.label}>Tipo de Agua</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {TIPOS_AGUA.map((tipo) => {
          const selected = ag.tiposAgua?.includes(tipo);
          return (
            <TouchableOpacity
              key={tipo}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleTipoAgua(tipo)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tipo}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* CONCESIÓN DE AGUA */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Concesión de Agua</Text>
        <Switch
          value={ag.concesionAgua}
          onValueChange={(v) => updateAgricolaFilter("concesionAgua", v)}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>

      {/* USO DEL TERRENO */}
      <RadioGroupSelector
        label="Uso del Terreno"
        options={[...USOS_TERRENO]}
        selectedValue={ag.usoTerreno}
        onSelect={(v) => updateAgricolaFilter("usoTerreno", v === ag.usoTerreno ? "" : v)}
      />

      {/* TIPO DE RIEGO */}
      <RadioGroupSelector
        label="Tipo de Riego"
        options={[...TIPOS_RIEGO]}
        selectedValue={ag.tipoRiego}
        onSelect={(v) => updateAgricolaFilter("tipoRiego", v === ag.tipoRiego ? "" : v)}
      />

      {/* INFRAESTRUCTURA */}
      <Text style={styles.label}>Infraestructura</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Electricidad</Text>
        <Switch
          value={ag.electricidad}
          onValueChange={(v) => updateAgricolaFilter("electricidad", v)}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Camino de Acceso</Text>
        <Switch
          value={ag.caminoAcceso}
          onValueChange={(v) => updateAgricolaFilter("caminoAcceso", v)}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Cercado</Text>
        <Switch
          value={ag.cercado}
          onValueChange={(v) => updateAgricolaFilter("cercado", v)}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>A pie de Carretera</Text>
        <Switch
          value={ag.pieCarretera}
          onValueChange={(v) => updateAgricolaFilter("pieCarretera", v)}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Acceso para Camiones</Text>
        <Switch
          value={ag.accesCamiones}
          onValueChange={(v) => updateAgricolaFilter("accesCamiones", v)}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  switchLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
});
