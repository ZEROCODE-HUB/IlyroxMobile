import { COLORS } from "@/constants/colors";
import {
  PROPERTY_TYPES,
  getCamposVisibles,
  esTerreno,
  TipoPrincipal,
} from "@/constants/propertyData";
import { AppInput } from "@/design-system/components/AppInput";
import { Post } from "@/types";
import {
  MultiLevelLocationPicker,
  LocationChipItem,
} from "@/components/common/MultiLevelLocationPicker";
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
  tipoPropiedad: string;
  setTipoPropiedad: (val: string) => void;
  moneda: string;
  setMoneda: (val: string) => void;
  banos: string;
  setBanos: (val: string) => void;
  mediosBanos: string;
  setMediosBanos: (val: string) => void;
  estacionamientos: string;
  setEstacionamientos: (val: string) => void;
  niveles: string;
  setNiveles: (val: string) => void;
  antiguedad: string;
  setAntiguedad: (val: string) => void;
  m2Terreno: string;
  setM2Terreno: (val: string) => void;
  m2Construccion: string;
  setM2Construccion: (val: string) => void;
  anchoTerreno: string;
  setAnchoTerreno: (val: string) => void;
  largoTerreno: string;
  setLargoTerreno: (val: string) => void;
  ubicaciones: LocationChipItem[];
  setUbicaciones: (next: LocationChipItem[]) => void;
  nota: string;
  setNota: (val: string) => void;
}

const OPERACION_OPTIONS = ["venta", "renta"] as const;
const MONEDA_OPTIONS = ["MXN", "USD"] as const;
const TIPO_PROPIEDAD_OPTIONS = Object.keys(PROPERTY_TYPES) as Array<
  keyof typeof PROPERTY_TYPES
>;

const handleCurrencyChange = (text: string, setter: (val: string) => void) => {
  const rawValue = text.replace(/,/g, "");
  if (/^\d*\.?\d*$/.test(rawValue)) {
    const parts = rawValue.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setter(parts.join("."));
  }
};

export const BusquedaPost = ({
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
  setTipoPropiedad,
  moneda,
  setMoneda,
  banos,
  setBanos,
  mediosBanos,
  setMediosBanos,
  estacionamientos,
  setEstacionamientos,
  niveles,
  setNiveles,
  antiguedad,
  setAntiguedad,
  m2Terreno,
  setM2Terreno,
  m2Construccion,
  setM2Construccion,
  anchoTerreno,
  setAnchoTerreno,
  largoTerreno,
  setLargoTerreno,
  ubicaciones,
  setUbicaciones,
  nota,
  setNota,
}: BusquedaPostProps) => {
  const subtipoOptions =
    (PROPERTY_TYPES as Record<string, readonly string[]>)[tipoPropiedad ?? ""] ?? [];

  // Visibilidad de campos según tipo/subtipo (misma fuente que publicar propiedad).
  const camposVisiblesBase = getCamposVisibles(
    subtipo,
    (tipoPropiedad || undefined) as TipoPrincipal | undefined,
  );
  const camposVisibles = {
    ...camposVisiblesBase,
    niveles: camposVisiblesBase.niveles && tipoPropiedad !== "industrial",
  };
  const isTerreno = esTerreno(subtipo);

  const toggleSubtipo = (val: string) => {
    setSubtipo(
      subtipo.includes(val) ? subtipo.filter((s) => s !== val) : [...subtipo, val]
    );
  };

  const handleTipoPropiedadSelect = (val: string) => {
    if (val === tipoPropiedad) {
      setTipoPropiedad("");
      setSubtipo([]);
    } else {
      setTipoPropiedad(val);
      setSubtipo([]);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Parámetros principales */}
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

          {/* Tipo de propiedad */}
          <View>
            <Text style={styles.fieldLabel}>Tipo de propiedad</Text>
            <View style={styles.chipsRow}>
              {TIPO_PROPIEDAD_OPTIONS.map((opt) => {
                const active = tipoPropiedad === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => handleTipoPropiedadSelect(opt)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
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

          {/* Moneda */}
          <View>
            <Text style={styles.fieldLabel}>Moneda</Text>
            <View style={styles.chipsRow}>
              {MONEDA_OPTIONS.map((m) => {
                const active = moneda === m;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setMoneda(m)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

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
        </View>
      </View>

      {/* Ubicación */}
      <View style={styles.card}>
        <Text style={styles.label}>Ubicación</Text>
        <View style={{ marginTop: 12 }}>
          <MultiLevelLocationPicker
            value={ubicaciones}
            onChange={setUbicaciones}
          />
        </View>
      </View>

      {/* Características */}
      {(camposVisibles.recamaras ||
        camposVisibles.banos ||
        camposVisibles.mediosBanos ||
        camposVisibles.estacionamientos ||
        camposVisibles.niveles ||
        camposVisibles.antiguedad) && (
        <View style={styles.card}>
          <Text style={styles.label}>Características</Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            <View style={styles.fieldsWrap}>
              {camposVisibles.recamaras && (
                <View style={styles.fieldHalf}>
                  <AppInput
                    label="Recámaras"
                    placeholder="Ej. 3"
                    keyboardType="numeric"
                    value={habitaciones}
                    onChangeText={setHabitaciones}
                  />
                </View>
              )}
              {camposVisibles.banos && (
                <View style={styles.fieldHalf}>
                  <AppInput
                    label="Baños"
                    placeholder="Ej. 2"
                    keyboardType="numeric"
                    value={banos}
                    onChangeText={setBanos}
                  />
                </View>
              )}
              {camposVisibles.mediosBanos && (
                <View style={styles.fieldHalf}>
                  <AppInput
                    label="Medios baños"
                    placeholder="Ej. 1"
                    keyboardType="numeric"
                    value={mediosBanos}
                    onChangeText={setMediosBanos}
                  />
                </View>
              )}
              {camposVisibles.estacionamientos && (
                <View style={styles.fieldHalf}>
                  <AppInput
                    label="Estacionamientos"
                    placeholder="Ej. 2"
                    keyboardType="numeric"
                    value={estacionamientos}
                    onChangeText={setEstacionamientos}
                  />
                </View>
              )}
              {camposVisibles.niveles && (
                <View style={styles.fieldHalf}>
                  <AppInput
                    label="Plantas"
                    placeholder="Ej. 2"
                    keyboardType="numeric"
                    value={niveles}
                    onChangeText={setNiveles}
                    helperText={
                      Number(niveles) > 0
                        ? `${niveles} planta${Number(niveles) === 1 ? "" : "s"}`
                        : undefined
                    }
                  />
                </View>
              )}
            </View>
            {camposVisibles.antiguedad && (
              <View>
                <AppInput
                  label="Antigüedad"
                  placeholder="Ej. Nueva, 5 años, etc."
                  value={antiguedad}
                  onChangeText={setAntiguedad}
                />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Superficies */}
      {(camposVisibles.m2Terreno || camposVisibles.m2Construccion || isTerreno) && (
        <View style={styles.card}>
          <Text style={styles.label}>Superficies</Text>
          <View style={[styles.fieldsWrap, { marginTop: 12 }]}>
            {camposVisibles.m2Terreno && (
              <View style={styles.fieldHalf}>
                <AppInput
                  label="m² Terreno (mín.)"
                  placeholder="Ej. 120"
                  keyboardType="numeric"
                  value={m2Terreno}
                  onChangeText={setM2Terreno}
                />
              </View>
            )}
            {camposVisibles.m2Construccion && (
              <View style={styles.fieldHalf}>
                <AppInput
                  label="m² Construcción (mín.)"
                  placeholder="Ej. 80"
                  keyboardType="numeric"
                  value={m2Construccion}
                  onChangeText={setM2Construccion}
                />
              </View>
            )}
            {isTerreno && (
              <>
                <View style={styles.fieldHalf}>
                  <AppInput
                    label="Frente (m) mín."
                    placeholder="Ej. 10"
                    keyboardType="numeric"
                    value={anchoTerreno}
                    onChangeText={(t) => handleCurrencyChange(t, setAnchoTerreno)}
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <AppInput
                    label="Fondo (m) mín."
                    placeholder="Ej. 25"
                    keyboardType="numeric"
                    value={largoTerreno}
                    onChangeText={(t) => handleCurrencyChange(t, setLargoTerreno)}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* Nota */}
      <View style={styles.card}>
        <Text style={styles.label}>Nota adicional</Text>
        <View style={{ marginTop: 12 }}>
          <AppInput
            multiline
            placeholder="Cuéntanos más sobre lo que buscas..."
            value={nota}
            onChangeText={(text) => {
              if (text.length <= 500) setNota(text);
            }}
            inputStyle={styles.noteTextArea}
            numberOfLines={5}
            maxLength={500}
            helperText={`${nota.length}/500`}
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
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  fieldsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  fieldHalf: {
    flexGrow: 1,
    flexBasis: "47%",
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
  noteTextArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
});
