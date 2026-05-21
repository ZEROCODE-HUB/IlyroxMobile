// ============================================
// GravamenFinancingSection - Gravamen y Financiamiento
// ============================================

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import { MultiSelectionModal } from "../../modals";
import RadioGroupSelector from "../../common/RadioGroupSelector";
import { COLORS } from "../../../constants/colors";
import {
  OPCIONES_SI_NO,
  INSTITUCIONES_GRAVAMEN,
  TIPOS_FINANCIAMIENTO,
} from "../../../constants/propertyData";
import type { SiNo } from "./types";
import { usePropertyFormContext } from "./PropertyFormContext";

export const GravamenFinancingSection = React.memo(
  function GravamenFinancingSection() {
    const {
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
    } = usePropertyFormContext();
    const [showInstitucionGravamenModal, setShowInstitucionGravamenModal] =
      useState(false);

    return (
      <>
        {/* GRAVAMEN */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderBand}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitleBand}>Gravamen</Text>
          </View>

          <RadioGroupSelector
            label="¿Tiene gravamen?"
            options={[...OPCIONES_SI_NO]}
            selectedValue={tieneGravamen}
            onSelect={(val) => setTieneGravamen(val as SiNo)}
          />

          {tieneGravamen === "Sí" && (
            <>
              <Text style={styles.label}>Instituciones de Gravamen</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setShowInstitucionGravamenModal(true)}
              >
                <Text
                  style={
                    institucionGravamen.length > 0
                      ? styles.selectorText
                      : styles.selectorPlaceholder
                  }
                >
                  {institucionGravamen.length > 0
                    ? `${institucionGravamen.length} seleccionado${institucionGravamen.length !== 1 ? "s" : ""}`
                    : "Selecciona instituciones..."}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              {institucionGravamen.length > 0 && (
                <View style={styles.selectedChipsContainer}>
                  {institucionGravamen.map((inst, idx) => (
                    <View key={idx} style={styles.selectedChip}>
                      <Text style={styles.selectedChipText}>{inst}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setInstitucionGravamen(
                            institucionGravamen.filter((_, i) => i !== idx)
                          );
                        }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color={COLORS.white}
                          style={styles.chipCloseIcon}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <MultiSelectionModal
                visible={showInstitucionGravamenModal}
                onClose={() => setShowInstitucionGravamenModal(false)}
                onSelect={(val) => setInstitucionGravamen(val)}
                title="Selecciona Instituciones de Gravamen"
                options={[...INSTITUCIONES_GRAVAMEN]}
                currentValues={institucionGravamen}
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
          <View style={styles.sectionHeaderBand}>
            <Ionicons name="card-outline" size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitleBand}>Financiamiento</Text>
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
  selectedChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  selectedChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.white,
  },
  chipCloseIcon: {
    marginLeft: 4,
  },
});
