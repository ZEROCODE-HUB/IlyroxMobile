import { COLORS } from "@/constants/colors";
import { PROPERTY_TYPES } from "@/constants/propertyData";
import { AppInput } from "@/design-system/components/AppInput";
import { Post } from "@/types";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface BusquedaPostProps {
  post: Post;
  precioMin: string;
  setPrecioMin: (val: string) => void;
  precioMax: string;
  setPrecioMax: (val: string) => void;
  habitaciones: string;
  setHabitaciones: (val: string) => void;
  operacion: string;
  setOperacion: (val: string) => void;
  subtipo: string[];
  setSubtipo: (val: string[]) => void;
  tipoPropiedad?: string;
}

const OPERACION_OPTIONS = ["venta", "renta"] as const;

export const BusquedaPost = ({
  post,
  precioMin,
  setPrecioMin,
  precioMax,
  setPrecioMax,
  habitaciones,
  setHabitaciones,
  operacion,
  setOperacion,
  subtipo,
  setSubtipo,
  tipoPropiedad,
}: BusquedaPostProps) => {
  const subtipoOptions =
    (PROPERTY_TYPES as Record<string, readonly string[]>)[tipoPropiedad ?? ""] ?? [];

  const toggleSubtipo = (val: string) => {
    setSubtipo(
      subtipo.includes(val) ? subtipo.filter((s) => s !== val) : [...subtipo, val]
    );
  };

  const handleCurrencyChange = (text: string, setter: (val: string) => void) => {
    const rawValue = text.replace(/,/g, "");
    if (/^\d*\.?\d*$/.test(rawValue)) {
      const parts = rawValue.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setter(parts.join("."));
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Parámetros de Búsqueda</Text>

      <View style={{ marginTop: 12, gap: 16 }}>
        {/* Operación */}
        <View>
          <Text style={styles.fieldLabel}>Operación</Text>
          <View style={styles.chipsRow}>
            {OPERACION_OPTIONS.map((op) => {
              const active = operacion.toLowerCase() === op;
              return (
                <TouchableOpacity
                  key={op}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setOperacion(active ? "" : op)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {op.charAt(0).toUpperCase() + op.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Subtipo */}
        {subtipoOptions.length > 0 && (
          <View>
            <Text style={styles.fieldLabel}>Tipo de inmueble</Text>
            <View style={styles.chipsRow}>
              {subtipoOptions.map((opt) => {
                const active = subtipo.includes(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleSubtipo(opt)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Precios */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Precio Mínimo"
              placeholder="Ej. 1,000,000"
              keyboardType="numeric"
              value={precioMin}
              onChangeText={(t) => handleCurrencyChange(t, setPrecioMin)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Precio Máximo"
              placeholder="Ej. 5,000,000"
              keyboardType="numeric"
              value={precioMax}
              onChangeText={(t) => handleCurrencyChange(t, setPrecioMax)}
            />
          </View>
        </View>

        {/* Habitaciones */}
        <View style={{ width: "50%" }}>
          <AppInput
            label="Recámaras"
            placeholder="Ej. 3"
            keyboardType="numeric"
            value={habitaciones}
            onChangeText={setHabitaciones}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
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
});
