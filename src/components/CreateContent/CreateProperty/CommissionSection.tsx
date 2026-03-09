// ============================================
// CommissionSection - Sección de comisión completa
// ============================================

import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import { SelectionModal } from "../../modals";
import RadioGroupSelector from "../../common/RadioGroupSelector";
import { COLORS } from "../../../constants/colors";
import { MONEDAS, OPCIONES_SI_NO } from "../../../constants/propertyData";
import type {
  TipoOperacion,
  MonedaType,
  SiNo,
  ComisionTipo,
  ComisionValues,
  ComisionSetters,
} from "./types";

interface CommissionSectionProps {
  tipoOperacion: TipoOperacion;
  moneda: MonedaType;
  setMoneda: (val: MonedaType) => void;
  handleCurrencyChange: (text: string, setter: (val: string) => void) => void;
  // Venta
  ventaValues: ComisionValues;
  ventaSetters: ComisionSetters;
  // Renta (solo si ambas)
  rentaValues: ComisionValues;
  rentaSetters: ComisionSetters;
}

export const CommissionSection = React.memo(function CommissionSection({
  tipoOperacion,
  moneda,
  setMoneda,
  handleCurrencyChange,
  ventaValues,
  ventaSetters,
  rentaValues,
  rentaSetters,
}: CommissionSectionProps) {
  const [showMonedaModal, setShowMonedaModal] = useState(false);

  const renderCommissionForm = (
    title: string,
    values: ComisionValues,
    setters: ComisionSetters,
    isSecondInstance = false,
  ) => (
    <View
      style={
        isSecondInstance
          ? {
              marginTop: 24,
              paddingTop: 24,
              borderTopWidth: 1,
              borderTopColor: COLORS.cardBorder,
            }
          : {}
      }
    >
      {tipoOperacion === "ambas" && (
        <Text
          style={[
            styles.sectionTitle,
            { fontSize: 16, marginBottom: 12, color: COLORS.textPrimary },
          ]}
        >
          {title}
        </Text>
      )}

      <RadioGroupSelector
        label="¿Compartes comisión?"
        options={[...OPCIONES_SI_NO]}
        selectedValue={values.comparte}
        onSelect={(val) => setters.setComparte(val as SiNo)}
      />

      {values.comparte === "Sí" && (
        <View>
          <Text style={styles.label}>¿Cuánto es tu comisión?</Text>
          <RadioGroupSelector
            options={["Porcentaje", "Monto"]}
            selectedValue={
              values.tipo === "porcentaje" ? "Porcentaje" : "Monto"
            }
            onSelect={(val) =>
              setters.setTipo(val === "Porcentaje" ? "porcentaje" : "monto")
            }
          />

          {values.tipo === "porcentaje" ? (
            <AppInput
              label="Porcentaje (%)"
              placeholder="3.0"
              keyboardType="numeric"
              value={values.valor}
              onChangeText={(text) => {
                const num = parseFloat(text);
                if (!text || (num >= 0 && num <= 100)) {
                  setters.setValor(text);
                }
              }}
            />
          ) : (
            <AppInput
              label="Monto"
              placeholder="0.00"
              keyboardType="numeric"
              value={values.valor}
              onChangeText={(text) =>
                handleCurrencyChange(text, setters.setValor)
              }
              leftIcon={
                <TouchableOpacity
                  style={styles.currencySelector}
                  onPress={() => setShowMonedaModal(true)}
                >
                  <Text style={styles.selectorText}>{moneda}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              }
            />
          )}

          <Text style={styles.label}>¿Cuánto de tu comisión compartes?</Text>
          <RadioGroupSelector
            options={["Porcentaje", "Monto"]}
            selectedValue={
              values.compartidaTipo === "porcentaje" ? "Porcentaje" : "Monto"
            }
            onSelect={(val) =>
              setters.setCompartidaTipo(
                val === "Porcentaje" ? "porcentaje" : "monto",
              )
            }
          />

          {values.compartidaTipo === "porcentaje" ? (
            <AppInput
              label="Porcentaje de Comisión (%)"
              placeholder="1.5"
              keyboardType="numeric"
              value={values.compartidaValor}
              onChangeText={(text) => {
                const num = parseFloat(text);
                if (!text || (num >= 0 && num <= 100)) {
                  setters.setCompartidaValor(text);
                }
              }}
            />
          ) : (
            <AppInput
              label="Monto Compartido"
              placeholder="0.00"
              keyboardType="numeric"
              value={values.compartidaValor}
              onChangeText={(text) =>
                handleCurrencyChange(text, setters.setCompartidaValor)
              }
              leftIcon={
                <TouchableOpacity
                  style={styles.currencySelector}
                  onPress={() => setShowMonedaModal(true)}
                >
                  <Text style={styles.selectorText}>{moneda}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              }
            />
          )}

          <AppInput
            label="Condiciones (opcional)"
            placeholder="Detalles de la comisión compartida..."
            value={values.condiciones}
            onChangeText={setters.setCondiciones}
            multiline
            numberOfLines={3}
            inputStyle={styles.textArea}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="cash" size={24} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Comisión</Text>
      </View>

      {renderCommissionForm(
        tipoOperacion === "ambas" ? "Comisión para Venta" : "Comisión",
        ventaValues,
        ventaSetters,
      )}

      {tipoOperacion === "ambas" &&
        renderCommissionForm(
          "Comisión para Renta",
          rentaValues,
          rentaSetters,
          true,
        )}

      <SelectionModal
        visible={showMonedaModal}
        onClose={() => setShowMonedaModal(false)}
        onSelect={(val) => setMoneda(val as MonedaType)}
        title="Moneda"
        options={[...MONEDAS]}
        currentValue={moneda}
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
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  textArea: {
    height: 100,
    width: "100%",
    textAlignVertical: "top",
    fontSize: 15,
    padding: 14,
  },
  selectorText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  currencySelector: {
    width: 110,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
