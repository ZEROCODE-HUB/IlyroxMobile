import React from "react";
import { View, Text, Switch, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import {
  TIPOS_AGUA,
  TIPOS_RIEGO,
} from "../../../constants/propertyData";
import RadioGroupSelector from "../../common/RadioGroupSelector";
import { usePropertyFormContext } from "./PropertyFormContext";

export const AgricolaSection = React.memo(function AgricolaSection() {
  const {
    tiposAgua,
    toggleTipoAgua,
    concesionAgua,
    setConcesionAgua,
    tipoRiego,
    setTipoRiego,
    infraElectricidad,
    setInfraElectricidad,
    infraCaminoAcceso,
    setInfraCaminoAcceso,
    infraCercado,
    setInfraCercado,
    accesoCarretera,
    setAccesoCarretera,
    accesoCamiones,
    setAccesoCamiones,
  } = usePropertyFormContext();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderBand}>
        <Ionicons name="leaf-outline" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitleBand}>Características Agrícolas</Text>
      </View>

      {/* FUENTE DE AGUA */}
      <Text style={styles.label}>Fuente de Agua</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {TIPOS_AGUA.map((tipo) => {
          const selected = tiposAgua.includes(tipo);
          return (
            <TouchableOpacity
              key={tipo}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleTipoAgua(tipo)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {tipo}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* CONCESIÓN DE AGUA */}
      <View style={styles.switchRow}>
        <View style={styles.switchLabelContainer}>
          <Text style={styles.switchLabel}>Concesión de Agua</Text>
          <Text style={styles.switchSub}>Derecho legal vigente</Text>
        </View>
        <Switch
          value={concesionAgua}
          onValueChange={setConcesionAgua}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>

      {/* SISTEMA DE RIEGO */}
      <RadioGroupSelector
        label="Sistema de Riego"
        options={[...TIPOS_RIEGO]}
        selectedValue={tipoRiego}
        onSelect={setTipoRiego}
      />

      {/* INFRAESTRUCTURA */}
      <Text style={styles.label}>Infraestructura</Text>
      <View style={styles.grid2Col}>
        <View style={styles.switchCard}>
          <Text style={styles.switchCardLabel}>Electricidad</Text>
          <Switch
            value={infraElectricidad}
            onValueChange={setInfraElectricidad}
            trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
        <View style={styles.switchCard}>
          <Text style={styles.switchCardLabel}>Acceso</Text>
          <Switch
            value={infraCaminoAcceso}
            onValueChange={setInfraCaminoAcceso}
            trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
        <View style={styles.switchCard}>
          <Text style={styles.switchCardLabel}>Cercado</Text>
          <Switch
            value={infraCercado}
            onValueChange={setInfraCercado}
            trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
      </View>

      {/* UBICACIÓN */}
      <Text style={[styles.label, { marginTop: 12 }]}>Ubicación</Text>
      <View style={styles.grid2Col}>
        <View style={styles.switchCard}>
          <Text style={styles.switchCardLabel}>A pie de Carretera</Text>
          <Switch
            value={accesoCarretera}
            onValueChange={setAccesoCarretera}
            trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
        <View style={styles.switchCard}>
          <Text style={styles.switchCardLabel}>Acceso para tráiler</Text>
          <Switch
            value={accesoCamiones}
            onValueChange={setAccesoCamiones}
            trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
            thumbColor={COLORS.white}
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
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  switchSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  grid2Col: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  switchCard: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  switchCardLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
});
