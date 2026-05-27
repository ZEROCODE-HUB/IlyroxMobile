// ============================================
// LocationSection - Sección de ubicación
// ============================================

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import CascadeLocationSelector from "../../common/CascadeLocationSelector";
import { COLORS } from "../../../constants/colors";
import { usePropertyFormContext } from "./PropertyFormContext";

export const LocationSection = React.memo(function LocationSection() {
  const {
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
  } = usePropertyFormContext();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderBand}>
        <Ionicons name="location-outline" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitleBand}>Ubicación</Text>
      </View>

      <AppInput label="País" value={pais} editable={false} />

      <CascadeLocationSelector
        initialData={ubicacionData}
        onChange={setUbicacionData}
        showColonia={true}
        multiColonia={true}
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
