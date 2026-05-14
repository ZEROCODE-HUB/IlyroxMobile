import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import { TIPOS_UBICACION_COMERCIAL } from "../../../constants/propertyData";
import { AppInput } from "../../../design-system/components/AppInput";
import RadioGroupSelector from "../../common/RadioGroupSelector";
import { usePropertyFormContext } from "./PropertyFormContext";

export const ComercialSection = React.memo(function ComercialSection() {
  const {
    tipoUbicacionComercial,
    setTipoUbicacionComercial,
    frenteMetros,
    setFrenteMetros,
    nivelPiso,
    setNivelPiso,
    sobreAvenidaPrincipal,
    setSobreAvenidaPrincipal,
    enEsquina,
    setEnEsquina,
    altaVisibilidad,
    setAltaVisibilidad,
    altoFlujoVehicular,
    setAltoFlujoVehicular,
  } = usePropertyFormContext();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderBand}>
        <Ionicons name="storefront-outline" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitleBand}>Características Comerciales</Text>
      </View>

      {/* TIPO DE UBICACIÓN */}
      <RadioGroupSelector
        label="Tipo de Ubicación"
        options={[...TIPOS_UBICACION_COMERCIAL]}
        selectedValue={tipoUbicacionComercial}
        onSelect={setTipoUbicacionComercial}
      />

      {/* FRENTE Y NIVEL */}
      <View style={styles.row}>
        <View style={styles.half}>
          <AppInput
            label="Frente (metros)"
            placeholder="ej. 10"
            keyboardType="decimal-pad"
            value={frenteMetros}
            onChangeText={setFrenteMetros}
          />
        </View>
        <View style={styles.half}>
          <AppInput
            label="Nivel / Piso"
            placeholder="ej. 2"
            keyboardType="number-pad"
            value={nivelPiso}
            onChangeText={setNivelPiso}
          />
        </View>
      </View>

      {/* CARACTERÍSTICAS */}
      <Text style={styles.label}>Características de Ubicación</Text>
      <View style={styles.grid2Col}>
        <View style={styles.switchCard}>
          <Text style={styles.switchCardLabel}>Sobre Avenida Principal</Text>
          <Switch
            value={sobreAvenidaPrincipal}
            onValueChange={setSobreAvenidaPrincipal}
            trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
        <View style={styles.switchCard}>
          <Text style={styles.switchCardLabel}>En Esquina</Text>
          <Switch
            value={enEsquina}
            onValueChange={setEnEsquina}
            trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
        <View style={styles.switchCard}>
          <Text style={styles.switchCardLabel}>Alta Visibilidad</Text>
          <Switch
            value={altaVisibilidad}
            onValueChange={setAltaVisibilidad}
            trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
        <View style={styles.switchCard}>
          <Text style={styles.switchCardLabel}>Alto Flujo Vehicular</Text>
          <Switch
            value={altoFlujoVehicular}
            onValueChange={setAltoFlujoVehicular}
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
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  half: {
    flex: 1,
  },
  grid2Col: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
