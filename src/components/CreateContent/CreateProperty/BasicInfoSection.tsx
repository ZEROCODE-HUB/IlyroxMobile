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
  { value: "agricola", label: "Agropecuario", icon: "leaf-outline" },
] as const;

const SUBTIPO_ICONS: Record<string, string> = {
  "casa (fracc. abierto)": "home-outline",
  "casa en condominio": "home-outline",
  "casa de campo/descanso/cabaña": "home-outline",
  "departamento": "apps-outline",
  "penthouse": "star-outline",
  "loft": "apps-outline",
  "terreno (fracc. abierto)": "map-outline",
  "terreno en condominio": "shield-outline",
  "local": "storefront-outline",
  "oficina": "briefcase-outline",
  "plaza": "grid-outline",
  "bodega": "cube-outline",
  "edificio": "business-outline",
  "terreno comercial": "map-outline",
  "casa con local/casa con uso comercial": "home-outline",
  "nave": "business-outline",
  "terreno para nave o bodega": "map-outline",
  "rancho / finca": "leaf-outline",
  "terreno rural": "earth-outline",
};

const SUBTIPO_NOTAS: Record<string, string> = {
  "penthouse": "Apartamento exclusivo situado en la última planta de un edificio",
  "loft": "Espacios sin muros de separación interior",
  "terreno en condominio": "Acceso controlado",
};

const INDUSTRIAL_NOTAS: Record<string, { desc: string }> = {
  "bodega": { desc: "Espacio cerrado para almacenamiento de mercancía, insumos o materiales. No está diseñada para producción." },
  "nave": { desc: "Espacio cerrado de gran tamaño diseñado para producción, fabricación, ensamblaje o procesos industriales." },
  "terreno para nave o bodega": { desc: "Terreno disponible para construir nave industrial o bodega de almacenamiento. No incluye construcción." },
};

const AGRICOLA_NOTAS: Record<string, { desc: string; fotos: string }> = {
  "rancho / finca": {
    desc: "Propiedad agropecuaria con posibles construcciones, áreas de cultivo, ganado o actividades rurales.",
    fotos: "Fotos de la casa, corrales, bodegas, áreas de cultivo, instalaciones, caminos internos, pozos, presas, etc.",
  },
  "terreno rural": {
    desc: "Terreno agropecuario, agrícola, forestal, breña o sin construcciones.",
    fotos: "Fotos del terreno, accesos, colindancias, relieve, vegetación, montes, breña, cuerpos de agua naturales, vistas, etc.",
  },
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

      {/* 2. SUBTIPO */}
      {subtiposDisponibles.length > 0 && (
        <>
          <Text style={styles.label}>Subtipo *</Text>
          {tipoPrincipal === "agricola" && (
            <Text style={styles.subtipoHint}>Elige el que mejor describa tu propiedad.</Text>
          )}
          {errors.subtipo && <Text style={styles.errorText}>{errors.subtipo}</Text>}

          {/* Industrial y Agropecuario: tarjetas grandes */}
          {(tipoPrincipal === "industrial" || tipoPrincipal === "agricola") ? (
            <View style={styles.subtipoCardList}>
              {subtiposDisponibles.map((sub) => {
                const selected = subtipo === sub;
                const key = sub.toLowerCase();
                const icon = SUBTIPO_ICONS[key] ?? "ellipse-outline";
                const notaIndustrial = INDUSTRIAL_NOTAS[key];
                const notaAgricola = AGRICOLA_NOTAS[key];

                return (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.subtipoCard, selected && styles.subtipoCardSelected]}
                    onPress={() => setSubtipo(selected ? "" : sub)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.subtipoCardHeader}>
                      <Ionicons name={icon as any} size={22} color={selected ? COLORS.primary : COLORS.textSecondary} />
                      <Text style={[styles.subtipoCardTitle, selected && styles.subtipoCardTitleSelected]}>
                        {sub}
                      </Text>
                      {tipoPrincipal === "agricola" && (
                        <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                          {selected && <View style={styles.radioInner} />}
                        </View>
                      )}
                    </View>
                    {notaIndustrial && (
                      <Text style={styles.subtipoCardDesc}>
                        <Text style={styles.notaLabel}>Nota:  </Text>
                        {notaIndustrial.desc}
                      </Text>
                    )}
                    {notaAgricola && (
                      <>
                        <Text style={styles.subtipoCardDesc}>{notaAgricola.desc}</Text>
                        <View style={styles.fotosBox}>
                          <Text style={styles.fotosTitle}>¿Qué puedes subir aquí?</Text>
                          <Text style={styles.fotosDesc}>{notaAgricola.fotos}</Text>
                        </View>
                        {key === "terreno rural" && (
                          <Text style={styles.terrenoRuralNote}>
                            Si seleccionas terreno sin construcción, no se mostrará el campo m² construidos.
                          </Text>
                        )}
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            /* Habitacional y Comercial: chips compactos */
            <View style={styles.subtipoGrid}>
              {subtiposDisponibles.map((sub) => {
                const selected = subtipo === sub;
                const key = sub.toLowerCase();
                const icon = SUBTIPO_ICONS[key] ?? "ellipse-outline";
                const nota = SUBTIPO_NOTAS[key];
                return (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.subtipoChip, selected && styles.subtipoChipSelected, nota && styles.subtipoChipWithNote]}
                    onPress={() => setSubtipo(selected ? "" : sub)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.subtipoChipRow}>
                      <Ionicons name={icon as any} size={15} color={selected ? COLORS.primary : COLORS.textSecondary} />
                      <Text style={[styles.subtipoLabel, selected && styles.subtipoLabelSelected]}>
                        {sub}
                      </Text>
                    </View>
                    {nota && (
                      <Text style={[styles.subtipoNota, selected && styles.subtipoNotaSelected]}>
                        {nota}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
  subtipoHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginTop: -4,
  },
  /* Chips compactos (habitacional / comercial) */
  subtipoChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  subtipoChipWithNote: {
    borderRadius: 12,
  },
  subtipoChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  subtipoNota: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  subtipoNotaSelected: {
    color: COLORS.primary + "BB",
  },
  /* Tarjetas grandes (industrial / agropecuario) */
  subtipoCardList: {
    gap: 10,
    marginBottom: 20,
  },
  subtipoCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    padding: 14,
    gap: 8,
  },
  subtipoCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "0A",
  },
  subtipoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  subtipoCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtipoCardTitleSelected: {
    color: COLORS.primary,
  },
  subtipoCardDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  notaLabel: {
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  fotosBox: {
    backgroundColor: COLORS.primary + "12",
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  fotosTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  fotosDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  terrenoRuralNote: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontStyle: "italic",
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
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
