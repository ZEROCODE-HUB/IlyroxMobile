import React from "react";
import { View, Text, Switch, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { TIPOS_UBICACION_COMERCIAL } from "@/constants/propertyData";
import { AppInput } from "@/design-system/components/AppInput";
import {
  usePropertyFiltersStore,
  type ComercialFilters,
} from "@/store/propertyFiltersStore";

interface ComercialFiltersSectionProps {
  /** Si se pasan, el componente opera sobre este valor en lugar del store global. */
  value?: ComercialFilters;
  onUpdate?: <K extends keyof ComercialFilters>(
    key: K,
    value: ComercialFilters[K],
  ) => void;
}

export const ComercialFiltersSection: React.FC<ComercialFiltersSectionProps> = ({
  value,
  onUpdate,
}) => {
  const store = usePropertyFiltersStore();
  const cf = value ?? store.filters.comercialFilters;
  const updateComercialFilter = onUpdate ?? store.updateComercialFilter;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Características Comerciales</Text>

      {/* TIPO DE UBICACIÓN (selección múltiple) */}
      <Text style={styles.label}>Tipo de Ubicación</Text>
      <View style={styles.chipsRow}>
        {TIPOS_UBICACION_COMERCIAL.map((op) => {
          const active = cf.tipoUbicacion.includes(op);
          return (
            <TouchableOpacity
              key={op}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() =>
                updateComercialFilter(
                  "tipoUbicacion",
                  active
                    ? cf.tipoUbicacion.filter((t) => t !== op)
                    : [...cf.tipoUbicacion, op],
                )
              }
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {op}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* FRENTE MÍNIMO Y NIVEL */}
      <View style={styles.row}>
        <View style={styles.half}>
          <AppInput
            label="Frente mínimo (m)"
            placeholder="ej. 10"
            keyboardType="decimal-pad"
            value={cf.frenteMin}
            onChangeText={(v) => updateComercialFilter("frenteMin", v)}
          />
        </View>
        <View style={styles.half}>
          <AppInput
            label="Nivel / Piso"
            placeholder="ej. 2"
            keyboardType="number-pad"
            value={cf.nivel}
            onChangeText={(v) => updateComercialFilter("nivel", v)}
          />
        </View>
      </View>

      {/* CARACTERÍSTICAS */}
      <Text style={styles.label}>Características de Ubicación</Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Sobre Avenida Principal</Text>
        <Switch
          value={cf.sobreAvenidaPrincipal}
          onValueChange={(v) => updateComercialFilter("sobreAvenidaPrincipal", v)}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>En Esquina</Text>
        <Switch
          value={cf.enEsquina}
          onValueChange={(v) => updateComercialFilter("enEsquina", v)}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Alta Visibilidad</Text>
        <Switch
          value={cf.altaVisibilidad}
          onValueChange={(v) => updateComercialFilter("altaVisibilidad", v)}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Alto Flujo Vehicular</Text>
        <Switch
          value={cf.altoFlujoVehicular}
          onValueChange={(v) => updateComercialFilter("altoFlujoVehicular", v)}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  half: {
    flex: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  switchLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
});
