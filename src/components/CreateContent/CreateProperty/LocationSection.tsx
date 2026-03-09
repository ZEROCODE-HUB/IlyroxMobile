// ============================================
// LocationSection - Sección de ubicación
// ============================================

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import CascadeLocationSelector from "../../common/CascadeLocationSelector";
import { COLORS } from "../../../constants/colors";
import type { UbicacionData } from "./types";

interface LocationSectionProps {
  pais: string;
  ubicacionData: UbicacionData;
  setUbicacionData: (data: UbicacionData) => void;
  calle: string;
  setCalle: (val: string) => void;
  numeroExterior: string;
  setNumeroExterior: (val: string) => void;
  numeroInterior: string;
  setNumeroInterior: (val: string) => void;
  codigoPostal: string;
  setCodigoPostal: (val: string) => void;
  errors: Record<string, string>;
}

export const LocationSection = React.memo(function LocationSection({
  pais,
  ubicacionData,
  setUbicacionData,
  calle,
  setCalle,
  numeroExterior,
  setNumeroExterior,
  numeroInterior,
  setNumeroInterior,
  codigoPostal,
  setCodigoPostal,
  errors,
}: LocationSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="location" size={24} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Ubicación</Text>
      </View>

      <AppInput label="País" value={pais} editable={false} />

      <CascadeLocationSelector
        initialData={ubicacionData}
        onChange={setUbicacionData}
        showColonia={true}
      />
      {errors.estado && <Text style={styles.errorText}>{errors.estado}</Text>}
      {errors.municipio && (
        <Text style={styles.errorText}>{errors.municipio}</Text>
      )}

      <AppInput
        label="Calle"
        placeholder="Ej: Av. Constitución"
        value={calle}
        onChangeText={setCalle}
      />

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <AppInput
            label="Número Ext."
            placeholder="123"
            value={numeroExterior}
            onChangeText={setNumeroExterior}
          />
        </View>
        <View style={styles.halfWidth}>
          <AppInput
            label="Número Int."
            placeholder="A"
            value={numeroInterior}
            onChangeText={setNumeroInterior}
          />
        </View>
      </View>

      <AppInput
        label="Código Postal"
        placeholder="64000"
        keyboardType="numeric"
        value={codigoPostal}
        onChangeText={setCodigoPostal}
        maxLength={6}
      />
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 5,
    marginBottom: 12,
  },
});
