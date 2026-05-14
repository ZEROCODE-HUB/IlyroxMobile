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
import { usePropertyFormContext } from "./PropertyFormContext";

const TIPO_CARDS = [
  { value: "habitacional", label: "Habitacional", icon: "home-outline" },
  { value: "comercial", label: "Comercial", icon: "storefront-outline" },
  { value: "industrial", label: "Industrial", icon: "business-outline" },
  { value: "agricola", label: "Agrícola", icon: "leaf-outline" },
] as const;

const SUBTIPO_ICONS: Record<string, string> = {
  "casa (fracc. abierto)": "home-outline",
  "casa en condominio": "home-outline",
  "casa de campo/descanso": "home-outline",
  "departamento": "apps-outline",
  "quinta": "home-outline",
  "rancho": "leaf-outline",
  "terreno": "map-outline",
  "villa": "home-outline",
  "local": "storefront-outline",
  "oficina": "briefcase-outline",
  "plaza": "grid-outline",
  "bodega": "cube-outline",
  "edificio": "business-outline",
  "terreno comercial": "map-outline",
  "casa con uso comercial": "home-outline",
  "bodega industrial": "cube-outline",
  "nave industrial": "business-outline",
  "terreno industrial": "map-outline",
  "rancho agrícola": "leaf-outline",
  "granja": "paw-outline",
  "invernadero": "flask-outline",
  "terreno agrícola": "earth-outline",
};

export const BasicInfoSection = React.memo(function BasicInfoSection() {
  const {
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
  } = usePropertyFormContext();
  const [showMonedaModal, setShowMonedaModal] = React.useState(false);

  const subtiposDisponibles = PROPERTY_TYPES[tipoPrincipal as TipoPrincipal] ?? [];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderBand}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitleBand}>Información Básica</Text>
      </View>

      {/* 1. TIPO DE PROPIEDAD — tarjetas 2×2 */}
      <Text style={styles.label}>Tipo de Propiedad *</Text>
      <View style={styles.tipoGrid}>
        {TIPO_CARDS.map((t) => {
          const selected = tipoPrincipal === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              style={[styles.tipoCard, selected && styles.tipoCardSelected]}
              onPress={() => {
                setTipoPrincipal(t.value as TipoPrincipal);
                setSubtipo("");
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={t.icon as any}
                size={28}
                color={selected ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[styles.tipoLabel, selected && styles.tipoLabelSelected]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. SUBTIPO — chips con ícono */}
      {subtiposDisponibles.length > 0 && (
        <>
          <Text style={styles.label}>Subtipo *</Text>
          {errors.subtipo && <Text style={styles.errorText}>{errors.subtipo}</Text>}
          <View style={styles.subtipoGrid}>
            {subtiposDisponibles.map((sub) => {
              const selected = subtipo === sub;
              const icon = SUBTIPO_ICONS[sub.toLowerCase()] ?? "ellipse-outline";
              return (
                <TouchableOpacity
                  key={sub}
                  style={[styles.subtipoChip, selected && styles.subtipoChipSelected]}
                  onPress={() => setSubtipo(selected ? "" : sub)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={icon as any}
                    size={15}
                    color={selected ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text style={[styles.subtipoLabel, selected && styles.subtipoLabelSelected]}>
                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* 3. TIPO DE OPERACIÓN */}
      <RadioGroupSelector
        label="Tipo de Operación *"
        options={["venta", "renta", "ambas"]}
        selectedValue={tipoOperacion}
        onSelect={(val) => setTipoOperacion(val as TipoOperacion)}
      />

      {/* 4. PRECIOS */}
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

      {/* 5. DESCRIPCIÓN */}
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
  textArea: {
    minHeight: 180,
    maxHeight: 450,
    width: "100%",
    textAlignVertical: "top",
    fontSize: 15,
    padding: 14,
    ...(Platform.OS === "web" && ({ resize: "vertical" } as any)),
  },
  tipoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  tipoCard: {
    width: "47.5%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    gap: 6,
  },
  tipoCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "0F",
  },
  tipoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  tipoLabelSelected: {
    color: COLORS.primary,
  },
  subtipoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  subtipoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  subtipoChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "0F",
  },
  subtipoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  subtipoLabelSelected: {
    color: COLORS.primary,
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
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 5,
    marginBottom: 12,
  },
});
