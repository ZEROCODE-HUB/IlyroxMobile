// ============================================
// GravamenFinancingSection - Gravamen y Financiamiento
// ============================================

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import { SelectionModal } from "../../modals";
import RadioGroupSelector from "../../common/RadioGroupSelector";
import { COLORS } from "../../../constants/colors";
import {
  OPCIONES_SI_NO,
  INSTITUCIONES_GRAVAMEN,
  TIPOS_FINANCIAMIENTO,
} from "../../../constants/propertyData";
import type { SiNo } from "./types";

interface GravamenFinancingSectionProps {
  // Gravamen
  tieneGravamen: SiNo;
  setTieneGravamen: (val: SiNo) => void;
  institucionGravamen: string;
  setInstitucionGravamen: (val: string) => void;
  montoGravamen: string;
  setMontoGravamen: (val: string) => void;
  handleCurrencyChange: (text: string, setter: (val: string) => void) => void;
  // Financiamiento
  aceptaFinanciamiento: SiNo;
  setAceptaFinanciamiento: (val: SiNo) => void;
  tiposFinanciamientoSeleccionados: string[];
  toggleFinanciamiento: (tipo: string) => void;
}

export const GravamenFinancingSection = React.memo(
  function GravamenFinancingSection({
    tieneGravamen,
    setTieneGravamen,
    institucionGravamen,
    setInstitucionGravamen,
    montoGravamen,
    setMontoGravamen,
    handleCurrencyChange,
    aceptaFinanciamiento,
    setAceptaFinanciamiento,
    tiposFinanciamientoSeleccionados,
    toggleFinanciamiento,
  }: GravamenFinancingSectionProps) {
    const [showInstitucionGravamenModal, setShowInstitucionGravamenModal] =
      useState(false);

    return (
      <>
        {/* GRAVAMEN */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Gravamen</Text>
          </View>

          <RadioGroupSelector
            label="¿Tiene gravamen?"
            options={[...OPCIONES_SI_NO]}
            selectedValue={tieneGravamen}
            onSelect={(val) => setTieneGravamen(val as SiNo)}
          />

          {tieneGravamen === "Sí" && (
            <>
              <Text style={styles.label}>Institución</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowInstitucionGravamenModal(true)}
              >
                <Text
                  style={
                    institucionGravamen
                      ? styles.selectorText
                      : styles.selectorPlaceholder
                  }
                >
                  {institucionGravamen || "Selecciona una institución..."}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <SelectionModal
                visible={showInstitucionGravamenModal}
                onClose={() => setShowInstitucionGravamenModal(false)}
                onSelect={(val) => setInstitucionGravamen(val)}
                title="Institución de Gravamen"
                options={[...INSTITUCIONES_GRAVAMEN]}
                currentValue={institucionGravamen}
                searchable
              />

              <AppInput
                label="Monto del Gravamen (opcional)"
                placeholder="0.00"
                keyboardType="numeric"
                value={montoGravamen}
                onChangeText={(text) =>
                  handleCurrencyChange(text, setMontoGravamen)
                }
              />
            </>
          )}
        </View>

        {/* FINANCIAMIENTO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="card" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Financiamiento</Text>
          </View>

          <RadioGroupSelector
            label="¿Acepta financiamiento?"
            options={[...OPCIONES_SI_NO]}
            selectedValue={aceptaFinanciamiento}
            onSelect={(val) => setAceptaFinanciamiento(val as SiNo)}
          />

          {aceptaFinanciamiento === "Sí" && (
            <>
              <Text style={styles.label}>Tipos de Financiamiento</Text>
              <View style={styles.amenidadesGrid}>
                {TIPOS_FINANCIAMIENTO.map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.amenidadChip,
                      tiposFinanciamientoSeleccionados.includes(tipo) &&
                        styles.amenidadChipActive,
                    ]}
                    onPress={() => toggleFinanciamiento(tipo)}
                  >
                    <Text
                      style={[
                        styles.amenidadText,
                        tiposFinanciamientoSeleccionados.includes(tipo) &&
                          styles.amenidadTextActive,
                      ]}
                    >
                      {tipo}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </>
    );
  },
);

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
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  selector: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectorText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  selectorPlaceholder: {
    color: COLORS.textTertiary,
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
