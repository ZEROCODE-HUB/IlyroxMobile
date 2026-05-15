import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/colors";
import { PROPERTY_TYPES } from "@/constants/propertyData";
import { AppInput } from "@/design-system/components/AppInput";
import { useCreateContent } from "@/hooks/useCreateContent";
import { useToast } from "@/context/ToastContext";
import CascadeLocationSelector from "@/components/common/CascadeLocationSelector";
import type {
  LocationChip,
  ComercialFilters,
  IndustrialFilters,
  AgricolaFilters,
} from "@/store/propertyFiltersStore";

interface LocationData {
  estado: string;
  ciudad: string;
  municipio: string;
  colonia: string;
  colonias?: string[];
  latitud?: number;
  longitud?: number;
}

interface PublishSearchPostModalProps {
  visible: boolean;
  initialMetadata?: any;
  onClose: () => void;
  onPublished: () => void;
  userId?: string;
}

const OPERACION_OPTIONS = ["venta", "renta"] as const;
const MONEDA_OPTIONS = ["MXN", "USD"] as const;

function formatNumericInput(num: number): string {
  const parts = String(num).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function handleCurrencyChange(text: string, setter: (val: string) => void) {
  const rawValue = text.replace(/,/g, "");
  if (/^\d*\.?\d*$/.test(rawValue)) {
    const parts = rawValue.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    setter(parts.join("."));
  }
}

export const PublishSearchPostModal: React.FC<PublishSearchPostModalProps> = ({
  visible,
  initialMetadata,
  onClose,
  onPublished,
  userId,
}) => {
  const insets = useSafeAreaInsets();
  const { createPost } = useCreateContent(userId);
  const { showToast } = useToast();

  const [operacion, setOperacion] = useState("");
  const [tipoPropiedad, setTipoPropiedad] = useState("");
  const [subtipo, setSubtipo] = useState<string[]>([]);
  const [moneda, setMoneda] = useState("MXN");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");

  // Ubicación: si ya viene del filtro se muestra como read-only; si no, muestra el selector
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [editingLocation, setEditingLocation] = useState(false);

  // Características
  const [habitaciones, setHabitaciones] = useState("");
  const [banos, setBanos] = useState("");
  const [estacionamientos, setEstacionamientos] = useState("");
  const [niveles, setNiveles] = useState("");
  const [antiguedad, setAntiguedad] = useState("");

  // Superficies
  const [m2Terreno, setM2Terreno] = useState("");
  const [m2Construccion, setM2Construccion] = useState("");

  // Zonas de interés (chips de ubicación nombrada, sin polígonos)
  const [zonasInteres, setZonasInteres] = useState<LocationChip[]>([]);

  // Nota libre del usuario
  const [nota, setNota] = useState("");

  // Filtros especializados (read-only, sólo se propagan)
  const [comercialFilters, setComercialFilters] = useState<ComercialFilters | null>(null);
  const [industrialFilters, setIndustrialFilters] = useState<IndustrialFilters | null>(null);
  const [agricolaFilters, setAgricolaFilters] = useState<AgricolaFilters | null>(null);

  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (visible && initialMetadata) {
      const f = initialMetadata.filtros ?? {};
      setOperacion(f.operacion ?? "");
      setTipoPropiedad(f.tipo_propiedad ?? "");
      setMoneda(f.moneda ?? "MXN");

      const rawSubtipo = f.subtipo;
      setSubtipo(Array.isArray(rawSubtipo) ? rawSubtipo : rawSubtipo ? [rawSubtipo] : []);

      setPrecioMin(f.precio_min && f.precio_min !== 0 ? formatNumericInput(f.precio_min) : "");
      setPrecioMax(f.precio_max ? formatNumericInput(f.precio_max) : "");

      const ub = f.ubicacion ?? {};
      const hasLocation = !!(ub.estado || ub.municipio || ub.ciudad);
      const incomingColonias: string[] = Array.isArray(ub.colonias)
        ? ub.colonias.filter((c: unknown) => typeof c === "string" && c.trim())
        : typeof ub.colonia === "string" && ub.colonia.trim()
          ? [ub.colonia]
          : [];
      if (hasLocation) {
        setLocationData({
          estado: ub.estado ?? "",
          ciudad: ub.ciudad ?? "",
          municipio: ub.municipio ?? "",
          colonia: incomingColonias[0] ?? "",
          colonias: incomingColonias,
        });
        setEditingLocation(false);
      } else {
        setLocationData(null);
        setEditingLocation(true);
      }

      const car = f.caracteristicas ?? {};
      setHabitaciones(car.habitaciones ? String(car.habitaciones) : "");
      setBanos(car.banos ? String(car.banos) : "");
      setEstacionamientos(car.estacionamientos ? String(car.estacionamientos) : "");
      setNiveles(car.niveles ? String(car.niveles) : "");
      setAntiguedad(car.antiguedad ? String(car.antiguedad) : "");

      const sup = f.superficies ?? {};
      setM2Terreno(sup.m2_terreno_min && sup.m2_terreno_min !== 0 ? String(sup.m2_terreno_min) : "");
      setM2Construccion(sup.m2_construccion_min && sup.m2_construccion_min !== 0 ? String(sup.m2_construccion_min) : "");

      setZonasInteres(Array.isArray(f.zonas_interes) ? f.zonas_interes : []);
      setNota(typeof f.nota === "string" ? f.nota : "");

      setComercialFilters(f.comercial ?? null);
      setIndustrialFilters(f.industrial ?? null);
      setAgricolaFilters(f.agricola ?? null);
    }
  }, [visible, initialMetadata]);

  const toggleSubtipo = (val: string) => {
    setSubtipo((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  const subtipoOptions =
    (PROPERTY_TYPES as Record<string, readonly string[]>)[tipoPropiedad] ?? [];

  const parseNum = (val: string) =>
    val.trim() ? parseFloat(val.replace(/,/g, "")) : null;

  const locationSummary = () => {
    if (!locationData) return null;
    const colonias = locationData.colonias && locationData.colonias.length > 0
      ? locationData.colonias.join(", ")
      : locationData.colonia;
    const parts = [locationData.estado, locationData.municipio, colonias]
      .filter(Boolean);
    return parts.join(", ") || null;
  };

  const handlePublish = async () => {
    if (!initialMetadata) return;

    const loc = locationData ?? initialMetadata.filtros?.ubicacion ?? {};

    const updatedMetadata = {
      ...initialMetadata,
      filtros: {
        ...initialMetadata.filtros,
        operacion: operacion || initialMetadata.filtros?.operacion,
        subtipo,
        moneda,
        precio_min: parseNum(precioMin) ?? initialMetadata.filtros?.precio_min ?? 0,
        precio_max: parseNum(precioMax) ?? initialMetadata.filtros?.precio_max ?? null,
        ubicacion: {
          estado: loc.estado ?? "",
          ciudad: loc.ciudad ?? "",
          municipio: loc.municipio ?? "",
          colonia: (Array.isArray(loc.colonias) && loc.colonias.length > 0
            ? loc.colonias[0]
            : loc.colonia) ?? "",
          colonias: Array.isArray(loc.colonias)
            ? loc.colonias
            : loc.colonia
              ? [loc.colonia]
              : [],
          icon: "location-outline",
        },
        zonas_interes: zonasInteres,
        caracteristicas: {
          ...initialMetadata.filtros?.caracteristicas,
          habitaciones: parseNum(habitaciones) ?? initialMetadata.filtros?.caracteristicas?.habitaciones,
          banos: parseNum(banos) ?? initialMetadata.filtros?.caracteristicas?.banos,
          estacionamientos: parseNum(estacionamientos) ?? initialMetadata.filtros?.caracteristicas?.estacionamientos,
          niveles: parseNum(niveles) ?? initialMetadata.filtros?.caracteristicas?.niveles,
          antiguedad: antiguedad || initialMetadata.filtros?.caracteristicas?.antiguedad,
        },
        superficies: {
          ...initialMetadata.filtros?.superficies,
          m2_terreno_min: parseNum(m2Terreno) ?? initialMetadata.filtros?.superficies?.m2_terreno_min ?? 0,
          m2_construccion_min: parseNum(m2Construccion) ?? initialMetadata.filtros?.superficies?.m2_construccion_min ?? 0,
          icon: "resize-outline",
        },
        nota: nota.trim(),
        ...(comercialFilters ? { comercial: comercialFilters } : {}),
        ...(industrialFilters ? { industrial: industrialFilters } : {}),
        ...(agricolaFilters ? { agricola: agricolaFilters } : {}),
      },
    };

    setPublishing(true);
    try {
      const success = await createPost("🔍  BUSCO PROPIEDAD:", [], "busqueda", updatedMetadata);
      if (success) {
        showToast("Post publicado en el feed", "success");
        onPublished();
      } else {
        showToast("Error al publicar el post", "error");
      }
    } catch {
      showToast("Error al publicar el post", "error");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Publicar búsqueda</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Prospecto */}
          {initialMetadata?.prospecto?.nombre ? (
            <View style={styles.prospectoCard}>
              <Ionicons name="person-circle-outline" size={20} color={COLORS.primary} />
              <Text style={styles.prospectoText}>
                {initialMetadata.prospecto.nombre}
                {initialMetadata.prospecto.telefono
                  ? `  ·  ${initialMetadata.prospecto.telefono}`
                  : ""}
              </Text>
            </View>
          ) : null}

          {/* ── Operación ─────────────────────────────────── */}
          <SectionCard label="Operación">
            <View style={styles.chipsRow}>
              {OPERACION_OPTIONS.map((op) => {
                const active = operacion.toLowerCase() === op;
                return (
                  <Chip
                    key={op}
                    label={op.charAt(0).toUpperCase() + op.slice(1)}
                    active={active}
                    onPress={() => setOperacion(active ? "" : op)}
                  />
                );
              })}
            </View>
          </SectionCard>

          {/* ── Tipo de inmueble ──────────────────────────── */}
          {subtipoOptions.length > 0 && (
            <SectionCard label="Tipo de inmueble">
              <View style={styles.chipsRow}>
                {subtipoOptions.map((opt) => (
                  <Chip
                    key={opt}
                    label={opt}
                    active={subtipo.includes(opt)}
                    onPress={() => toggleSubtipo(opt)}
                  />
                ))}
              </View>
            </SectionCard>
          )}

          {/* ── Precio ────────────────────────────────────── */}
          <SectionCard label="Precio">
            <View style={styles.chipsRow}>
              {MONEDA_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  label={m}
                  active={moneda === m}
                  onPress={() => setMoneda(m)}
                />
              ))}
            </View>
            <View style={[styles.row, { marginTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="Precio mínimo"
                  placeholder="Ej. 1,000,000"
                  keyboardType="numeric"
                  value={precioMin}
                  onChangeText={(t) => handleCurrencyChange(t, setPrecioMin)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="Precio máximo"
                  placeholder="Sin límite"
                  keyboardType="numeric"
                  value={precioMax}
                  onChangeText={(t) => handleCurrencyChange(t, setPrecioMax)}
                />
              </View>
            </View>
          </SectionCard>

          {/* ── Ubicación ─────────────────────────────────── */}
          <SectionCard label="Ubicación">
            {locationData && !editingLocation ? (
              /* Mostrar la ubicación que ya viene del filtro */
              <View style={styles.locationDisplay}>
                <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                <Text style={styles.locationText}>{locationSummary()}</Text>
                <TouchableOpacity
                  onPress={() => setEditingLocation(true)}
                  style={styles.changeLocationBtn}
                  hitSlop={8}
                >
                  <Text style={styles.changeLocationText}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Selector en cascada */
              <>
                {locationData && editingLocation && (
                  <TouchableOpacity
                    onPress={() => setEditingLocation(false)}
                    style={styles.cancelEditLocation}
                    hitSlop={8}
                  >
                    <Ionicons name="arrow-back-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.changeLocationText}>Volver a la selección anterior</Text>
                  </TouchableOpacity>
                )}
                <CascadeLocationSelector
                  isMandatory={false}
                  showColonia={true}
                  multiColonia={true}
                  initialData={locationData ?? undefined}
                  onChange={(data) => setLocationData(data)}
                />
              </>
            )}
          </SectionCard>

          {/* ── Zonas de interés (chips del mapa) ────────── */}
          {zonasInteres.length > 0 && (
            <SectionCard label="Zonas de interés">
              <View style={styles.chipsRow}>
                {zonasInteres.map((zona) => (
                  <View key={zona.id} style={styles.zonaChip}>
                    <Text style={styles.zonaChipPin}>📍</Text>
                    <Text style={styles.zonaChipText} numberOfLines={1}>
                      {zona.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setZonasInteres((prev) => prev.filter((z) => z.id !== zona.id))
                      }
                      hitSlop={8}
                      style={styles.zonaChipRemove}
                    >
                      <Ionicons name="close" size={14} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </SectionCard>
          )}

          {/* ── Características ───────────────────────────── */}
          <SectionCard label="Características">
            <View style={{ gap: 10 }}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Recámaras"
                    placeholder="Ej. 3"
                    keyboardType="numeric"
                    value={habitaciones}
                    onChangeText={setHabitaciones}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Baños"
                    placeholder="Ej. 2"
                    keyboardType="numeric"
                    value={banos}
                    onChangeText={setBanos}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Estacionamientos"
                    placeholder="Ej. 2"
                    keyboardType="numeric"
                    value={estacionamientos}
                    onChangeText={setEstacionamientos}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Niveles"
                    placeholder="Ej. 2"
                    keyboardType="numeric"
                    value={niveles}
                    onChangeText={setNiveles}
                  />
                </View>
              </View>
              <AppInput
                label="Antigüedad"
                placeholder="Ej. Nueva, 5 años…"
                value={antiguedad}
                onChangeText={setAntiguedad}
              />
            </View>
          </SectionCard>

          {/* ── Superficies ───────────────────────────────── */}
          <SectionCard label="Superficies">
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="m² terreno mín."
                  placeholder="Ej. 200"
                  keyboardType="numeric"
                  value={m2Terreno}
                  onChangeText={setM2Terreno}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppInput
                  label="m² construcción mín."
                  placeholder="Ej. 150"
                  keyboardType="numeric"
                  value={m2Construccion}
                  onChangeText={setM2Construccion}
                />
              </View>
            </View>
          </SectionCard>

          {/* ── Detalles adicionales (filtros especializados) ── */}
          {(comercialFilters || industrialFilters || agricolaFilters) && (
            <SectionCard label="Detalles adicionales">
              {comercialFilters && (
                <SpecializedSummary
                  title="Comercial"
                  rows={summarizeComercial(comercialFilters)}
                />
              )}
              {industrialFilters && (
                <SpecializedSummary
                  title="Industrial"
                  rows={summarizeIndustrial(industrialFilters)}
                />
              )}
              {agricolaFilters && (
                <SpecializedSummary
                  title="Agrícola"
                  rows={summarizeAgricola(agricolaFilters)}
                />
              )}
            </SectionCard>
          )}

          {/* ── Nota libre ───────────────────────────────── */}
          <SectionCard label="Nota">
            <AppInput
              placeholder="Agrega contexto: zona tranquila, con cochera techada…"
              value={nota}
              onChangeText={setNota}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              inputStyle={styles.notaInput}
              maxLength={500}
              showCounter
            />
          </SectionCard>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.publishBtn, publishing && styles.publishBtnDisabled]}
            onPress={handlePublish}
            disabled={publishing}
            activeOpacity={0.85}
          >
            {publishing ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Ionicons name="paper-plane-outline" size={20} color={COLORS.white} />
            )}
            <Text style={styles.publishBtnText}>
              {publishing ? "Publicando..." : "Publicar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SpecializedSummary({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.specializedBlock}>
      <Text style={styles.specializedTitle}>{title}</Text>
      {rows.map(([key, value]) => (
        <View key={key} style={styles.specializedRow}>
          <Text style={styles.specializedKey}>{key}</Text>
          <Text style={styles.specializedValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function summarizeComercial(f: ComercialFilters): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  if (f.tipoUbicacion) out.push(["Ubicación", f.tipoUbicacion]);
  if (f.frenteMin) out.push(["Frente mín.", `${f.frenteMin} m`]);
  if (f.nivel) out.push(["Nivel", f.nivel]);
  const flags: string[] = [];
  if (f.sobreAvenidaPrincipal) flags.push("Av. principal");
  if (f.enEsquina) flags.push("En esquina");
  if (f.altaVisibilidad) flags.push("Alta visibilidad");
  if (f.altoFlujoVehicular) flags.push("Alto flujo");
  if (flags.length) out.push(["Características", flags.join(", ")]);
  return out;
}

function summarizeIndustrial(f: IndustrialFilters): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  if (f.ubicacion) out.push(["Ubicación", f.ubicacion]);
  if (f.alturaLibre) out.push(["Altura libre", f.alturaLibre]);
  if (f.energiaKva?.length) out.push(["Energía", f.energiaKva.join(", ")]);
  if (f.areaOficinasMin) out.push(["Área oficinas mín.", `${f.areaOficinasMin} m²`]);
  if (f.patioManiobrasMin) out.push(["Patio maniobras mín.", `${f.patioManiobrasMin} m²`]);
  return out;
}

function summarizeAgricola(f: AgricolaFilters): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  if (f.tiposAgua?.length) out.push(["Tipos de agua", f.tiposAgua.join(", ")]);
  if (f.concesionAgua) out.push(["Concesión de agua", "Sí"]);
  if (f.usoTerreno) out.push(["Uso de terreno", f.usoTerreno]);
  if (f.tipoRiego) out.push(["Tipo de riego", f.tipoRiego]);
  const flags: string[] = [];
  if (f.electricidad) flags.push("Electricidad");
  if (f.caminoAcceso) flags.push("Camino de acceso");
  if (f.cercado) flags.push("Cercado");
  if (f.pieCarretera) flags.push("Pie de carretera");
  if (f.accesCamiones) flags.push("Acceso camiones");
  if (flags.length) out.push(["Servicios", flags.join(", ")]);
  return out;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },
  closeBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 0,
  },
  prospectoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary + "10",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  prospectoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  },
  locationDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  changeLocationBtn: {
    paddingHorizontal: 6,
  },
  changeLocationText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  cancelEditLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  publishBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
  zonaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    maxWidth: "100%",
  },
  zonaChipPin: {
    fontSize: 13,
  },
  zonaChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    maxWidth: 180,
  },
  zonaChipRemove: {
    paddingHorizontal: 2,
  },
  notaInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  specializedBlock: {
    marginBottom: 12,
  },
  specializedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  specializedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4,
    gap: 12,
  },
  specializedKey: {
    fontSize: 13,
    color: COLORS.textTertiary,
    flexShrink: 0,
  },
  specializedValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
});
