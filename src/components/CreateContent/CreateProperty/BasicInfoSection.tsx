// ============================================
// BasicInfoSection - Información Básica de la propiedad
// ============================================

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import { SelectionModal } from "../../modals";
import RadioGroupSelector from "../../common/RadioGroupSelector";
import { COLORS } from "../../../constants/colors";
import {
  PROPERTY_TYPES,
  MONEDAS,
  TipoPrincipal,
} from "../../../constants/propertyData";
import type { TipoOperacion, MonedaType } from "./types";

interface BasicInfoSectionProps {
  descripcion: string;
  setDescripcion: (val: string) => void;
  tipoOperacion: TipoOperacion;
  setTipoOperacion: (val: TipoOperacion) => void;
  precioVenta: string;
  precioRenta: string;
  moneda: MonedaType;
  setMoneda: (val: MonedaType) => void;
  tipoPrincipal: string;
  setTipoPrincipal: (val: TipoPrincipal) => void;
  subtipo: string;
  setSubtipo: (val: string) => void;
  handleCurrencyChange: (text: string, setter: (val: string) => void) => void;
  setPrecioVenta: (val: string) => void;
  setPrecioRenta: (val: string) => void;
  errors: Record<string, string>;
}

export const BasicInfoSection = React.memo(function BasicInfoSection({
  descripcion,
  setDescripcion,
  tipoOperacion,
  setTipoOperacion,
  precioVenta,
  precioRenta,
  moneda,
  setMoneda,
  tipoPrincipal,
  setTipoPrincipal,
  subtipo,
  setSubtipo,
  handleCurrencyChange,
  setPrecioVenta,
  setPrecioRenta,
  errors,
}: BasicInfoSectionProps) {
  const [showMonedaModal, setShowMonedaModal] = React.useState(false);
  const [showTipoPrincipalModal, setShowTipoPrincipalModal] =
    React.useState(false);
  const [showSubtipoModal, setShowSubtipoModal] = React.useState(false);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="information-circle" size={24} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Información Básica</Text>
      </View>

      <AppInput
        label="Descripción *"
        placeholder="Describe las características principales..."
        value={descripcion}
        onChangeText={(text) => {
          if (text.length <= 2500) {
            setDescripcion(text);
          } else {
            setDescripcion(text.substring(0, 2500));
          }
        }}
        multiline
        numberOfLines={10}
        maxLength={2500}
        helperText={`${descripcion.length}/2500`}
        inputStyle={styles.textArea}
        error={errors.descripcion}
      />

      <RadioGroupSelector
        label="Tipo de Operación *"
        options={["venta", "renta", "ambas"]}
        selectedValue={tipoOperacion}
        onSelect={(val) => setTipoOperacion(val as TipoOperacion)}
      />

      {(tipoOperacion === "venta" || tipoOperacion === "ambas") && (
        <AppInput
          label="Precio de Venta *"
          placeholder="0.00"
          keyboardType="numeric"
          value={precioVenta}
          onChangeText={(text) => handleCurrencyChange(text, setPrecioVenta)}
          error={errors.precioVenta}
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

      {(tipoOperacion === "renta" || tipoOperacion === "ambas") && (
        <AppInput
          label="Precio de Renta Mensual *"
          placeholder="0.00"
          keyboardType="numeric"
          value={precioRenta}
          onChangeText={(text) => handleCurrencyChange(text, setPrecioRenta)}
          error={errors.precioRenta}
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

      <SelectionModal
        visible={showMonedaModal}
        onClose={() => setShowMonedaModal(false)}
        onSelect={(val) => setMoneda(val as MonedaType)}
        title="Moneda"
        options={[...MONEDAS]}
        currentValue={moneda}
      />

      <Text style={styles.label}>Tipo de Propiedad *</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowTipoPrincipalModal(true)}
      >
        <Text style={styles.selectorText}>
          {tipoPrincipal.charAt(0).toUpperCase() + tipoPrincipal.slice(1)}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <SelectionModal
        visible={showTipoPrincipalModal}
        onClose={() => setShowTipoPrincipalModal(false)}
        onSelect={(val) => {
          setTipoPrincipal(val as TipoPrincipal);
          setSubtipo("");
        }}
        title="Tipo de Propiedad"
        options={[
          { label: "Habitacional", value: "habitacional" },
          { label: "Comercial", value: "comercial" },
          { label: "Industrial", value: "industrial" },
          { label: "Agrícola", value: "agricola" },
        ]}
        currentValue={tipoPrincipal}
      />

      {errors.subtipo && <Text style={styles.errorText}>{errors.subtipo}</Text>}

      <Text style={styles.label}>Subtipo *</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setShowSubtipoModal(true)}
      >
        <Text
          style={subtipo ? styles.selectorText : styles.selectorPlaceholder}
        >
          {subtipo || "Selecciona..."}
        </Text>
        <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <SelectionModal
        visible={showSubtipoModal}
        onClose={() => setShowSubtipoModal(false)}
        onSelect={setSubtipo}
        title="Subtipo"
        options={[...PROPERTY_TYPES[tipoPrincipal as TipoPrincipal]]}
        currentValue={subtipo}
        searchable
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
    minHeight: 180,
    maxHeight: 450,
    width: "100%",
    textAlignVertical: "top",
    fontSize: 15,
    padding: 14,
    ...(Platform.OS === "web" && ({ resize: "vertical" } as any)),
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
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 5,
    marginBottom: 12,
  },
});
