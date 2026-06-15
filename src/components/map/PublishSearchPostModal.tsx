import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  KeyboardProvider,
  KeyboardAwareScrollView,
} from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { COLORS } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { Post } from "@/types";
import {
  PROPERTY_TYPES,
  getCamposVisibles,
  esTerreno,
  TipoPrincipal,
} from "@/constants/propertyData";
import { AppInput } from "@/design-system/components/AppInput";
import { useCreateContent } from "@/hooks/useCreateContent";
import { useToast } from "@/context/ToastContext";
import {
  MultiLevelLocationPicker,
  LocationChipItem,
} from "@/components/common/MultiLevelLocationPicker";
import {
  ComercialFilters,
  IndustrialFilters,
  AgricolaFilters,
  initialComercialFilters,
  initialIndustrialFilters,
  initialAgricolaFilters,
} from "@/store/propertyFiltersStore";
import { ComercialFiltersSection } from "./filters/ComercialFiltersSection";
import { IndustrialFiltersSection } from "./filters/IndustrialFiltersSection";
import { AgricolaFiltersSection } from "./filters/AgricolaFiltersSection";

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
  /** Si se pasa, el modal opera en modo edición sobre este post existente. */
  editPost?: Post;
}

const OPERACION_OPTIONS = ["venta", "renta"] as const;
const MONEDA_OPTIONS = ["MXN", "USD"] as const;
const TIPO_PROPIEDAD_OPTIONS = Object.keys(PROPERTY_TYPES) as Array<
  keyof typeof PROPERTY_TYPES
>;

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
  editPost,
}) => {
  const insets = useSafeAreaInsets();
  const { createPost } = useCreateContent(userId);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!editPost;

  const [operaciones, setOperaciones] = useState<string[]>([]);
  const [tipoPropiedad, setTipoPropiedad] = useState("");
  const [subtipo, setSubtipo] = useState<string[]>([]);
  const [moneda, setMoneda] = useState("MXN");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [precioRentaMin, setPrecioRentaMin] = useState("");
  const [precioRentaMax, setPrecioRentaMax] = useState("");

  // Ubicación legacy: mantenida para retrocompat con metadata anterior
  const [locationData, setLocationData] = useState<LocationData | null>(null);

  // Lista de ubicaciones agregadas como chips multi-nivel
  const [ubicaciones, setUbicaciones] = useState<LocationChipItem[]>([]);

  // Características
  const [habitaciones, setHabitaciones] = useState("");
  const [banos, setBanos] = useState("");
  const [estacionamientos, setEstacionamientos] = useState("");
  const [niveles, setNiveles] = useState("");
  const [antiguedad, setAntiguedad] = useState("");

  // Superficies
  const [m2Terreno, setM2Terreno] = useState("");
  const [m2Construccion, setM2Construccion] = useState("");
  // Dimensiones del terreno (frente/fondo), solo terrenos
  const [anchoTerreno, setAnchoTerreno] = useState("");
  const [largoTerreno, setLargoTerreno] = useState("");

  // Nota libre del usuario
  const [nota, setNota] = useState("");

  // Filtros especializados (read-only, sólo se propagan)
  const [comercialFilters, setComercialFilters] = useState<ComercialFilters | null>(null);
  const [industrialFilters, setIndustrialFilters] = useState<IndustrialFilters | null>(null);
  const [agricolaFilters, setAgricolaFilters] = useState<AgricolaFilters | null>(null);

  const [publishing, setPublishing] = useState(false);

  // Cargar el metadata SOLO una vez por apertura del modal. Evita re-ejecutar
  // la cascada de ~18 setState en cada render (posible "Maximum update depth").
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!visible) {
      didInitRef.current = false;
      return;
    }
    if (didInitRef.current) return;
    if (initialMetadata) {
      didInitRef.current = true;
      const f = initialMetadata.filtros ?? {};
      const incomingOps = Array.isArray(f.operaciones)
        ? f.operaciones
        : f.operacion
          ? [f.operacion]
          : [];
      setOperaciones(
        incomingOps
          .map((o: any) => String(o).toLowerCase())
          .filter((o: string) => o === "venta" || o === "renta"),
      );
      setTipoPropiedad(f.tipo_propiedad ?? "");
      setMoneda(f.moneda ?? "MXN");

      const rawSubtipo = f.subtipo;
      setSubtipo(Array.isArray(rawSubtipo) ? rawSubtipo : rawSubtipo ? [rawSubtipo] : []);

      setPrecioMin(f.precio_min && f.precio_min !== 0 ? formatNumericInput(f.precio_min) : "");
      setPrecioMax(f.precio_max ? formatNumericInput(f.precio_max) : "");
      setPrecioRentaMin(f.precio_renta_min && f.precio_renta_min !== 0 ? formatNumericInput(f.precio_renta_min) : "");
      setPrecioRentaMax(f.precio_renta_max ? formatNumericInput(f.precio_renta_max) : "");

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
      } else {
        setLocationData(null);
      }

      // Ubicaciones multi-nivel: si vienen del filtro las cargamos
      const incomingUbicaciones: LocationChipItem[] = Array.isArray(f.ubicaciones)
        ? f.ubicaciones.filter((u: any) => u && u.level && u.estado)
        : [];

      // Retrocompat: posts antiguos sin `ubicaciones[]` traen solo `ubicacion`
      // (legacy). Derivamos chips desde colonias/municipio/estado para que la
      // edición no quede sin ubicación y la validación no la bloquee.
      let finalUbicaciones: LocationChipItem[] = incomingUbicaciones;
      if (finalUbicaciones.length === 0 && ub.estado) {
        if (incomingColonias.length > 0) {
          finalUbicaciones = incomingColonias.map((col) => ({
            level: "colonia" as const,
            estado: ub.estado,
            municipio: ub.municipio,
            colonia: col,
            label: [col, ub.municipio, ub.estado].filter(Boolean).join(", "),
          }));
        } else if (ub.municipio) {
          finalUbicaciones = [
            {
              level: "municipio",
              estado: ub.estado,
              municipio: ub.municipio,
              label: [ub.municipio, ub.estado].filter(Boolean).join(", "),
            },
          ];
        } else {
          finalUbicaciones = [
            {
              level: "estado",
              estado: ub.estado,
              label: ub.estado,
            },
          ];
        }
      }
      setUbicaciones(finalUbicaciones);

      const car = f.caracteristicas ?? {};
      setHabitaciones(car.habitaciones ? String(car.habitaciones) : "");
      setBanos(car.banos ? String(car.banos) : "");
      setEstacionamientos(car.estacionamientos ? String(car.estacionamientos) : "");
      setNiveles(car.niveles ? String(car.niveles) : "");
      setAntiguedad(car.antiguedad ? String(car.antiguedad) : "");

      const sup = f.superficies ?? {};
      setM2Terreno(sup.m2_terreno_min && sup.m2_terreno_min !== 0 ? formatNumericInput(sup.m2_terreno_min) : "");
      setM2Construccion(sup.m2_construccion_min && sup.m2_construccion_min !== 0 ? formatNumericInput(sup.m2_construccion_min) : "");
      setAnchoTerreno(sup.ancho_terreno_min && sup.ancho_terreno_min !== 0 ? formatNumericInput(sup.ancho_terreno_min) : "");
      setLargoTerreno(sup.largo_terreno_min && sup.largo_terreno_min !== 0 ? formatNumericInput(sup.largo_terreno_min) : "");

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

  const toggleOperacion = (val: string) => {
    setOperaciones((prev) =>
      prev.includes(val) ? prev.filter((o) => o !== val) : [...prev, val],
    );
  };

  // Visibilidad de campos por tipo (misma lógica que publicar propiedad):
  // p.ej. Comercial/Industrial no muestran "Recámaras".
  const camposVisiblesBase = getCamposVisibles(
    subtipo,
    (tipoPropiedad || undefined) as TipoPrincipal | undefined,
  );
  // Regla propia del post de búsqueda: Industrial no usa "niveles".
  const camposVisibles = {
    ...camposVisiblesBase,
    niveles: camposVisiblesBase.niveles && tipoPropiedad !== "industrial",
  };
  const isTerreno = esTerreno(subtipo);

  // Qué precios mostrar según la(s) operación(es): si no hay operación elegida,
  // se asume compra (rango único).
  const mostrarVenta = operaciones.length === 0 || operaciones.includes("venta");
  const mostrarRenta = operaciones.includes("renta");

  const handlePublish = async () => {
    if (!initialMetadata) return;

    // Validación: se requiere al menos una ubicación escrita en el picker
    if (ubicaciones.length === 0) {
      showToast("Selecciona al menos una ubicación", "error");
      return;
    }

    // Derivar ubicacion legacy desde el primer chip multi-nivel (si hay)
    const firstChip = ubicaciones[0];
    const legacyUbicacion = firstChip
      ? {
          estado: firstChip.estado ?? "",
          ciudad: "",
          municipio: firstChip.municipio ?? "",
          colonia: firstChip.colonia ?? "",
          colonias: ubicaciones
            .filter((u) => u.level === "colonia" && !!u.colonia)
            .map((u) => u.colonia as string),
          icon: "location-outline",
        }
      : (() => {
          const loc = locationData ?? initialMetadata.filtros?.ubicacion ?? {};
          return {
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
          };
        })();

    const updatedMetadata = {
      ...initialMetadata,
      filtros: {
        ...initialMetadata.filtros,
        operacion: operaciones.length === 1 ? operaciones[0] : "",
        operaciones,
        tipo_propiedad: tipoPropiedad || initialMetadata.filtros?.tipo_propiedad,
        subtipo,
        moneda,
        precio_min: parseNum(precioMin) ?? initialMetadata.filtros?.precio_min ?? 0,
        precio_max: parseNum(precioMax) ?? initialMetadata.filtros?.precio_max ?? null,
        precio_renta_min: parseNum(precioRentaMin) ?? initialMetadata.filtros?.precio_renta_min ?? 0,
        precio_renta_max: parseNum(precioRentaMax) ?? initialMetadata.filtros?.precio_renta_max ?? null,
        ubicacion: legacyUbicacion,
        ubicaciones,
        zonas_interes: [],
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
          ancho_terreno_min: parseNum(anchoTerreno) ?? initialMetadata.filtros?.superficies?.ancho_terreno_min ?? 0,
          largo_terreno_min: parseNum(largoTerreno) ?? initialMetadata.filtros?.superficies?.largo_terreno_min ?? 0,
          icon: "resize-outline",
        },
        nota: nota.trim(),
        ...(tipoPropiedad === "comercial" && comercialFilters ? { comercial: comercialFilters } : {}),
        ...(tipoPropiedad === "industrial" && industrialFilters ? { industrial: industrialFilters } : {}),
        ...(tipoPropiedad === "agricola" && agricolaFilters ? { agricola: agricolaFilters } : {}),
      },
    };

    setPublishing(true);
    try {
      if (isEditing && editPost) {
        // Modo edición: actualizar el post existente conservando contenido/status.
        const { error } = await supabase
          .from("posts")
          .update({ busquedas_json: updatedMetadata, updated_at: new Date() })
          .eq("id", editPost.id);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        showToast("Búsqueda actualizada", "success");
        onPublished();
      } else {
        const success = await createPost("🔍  BUSCO PROPIEDAD:", [], "busqueda", updatedMetadata);
        if (success) {
          showToast("Post publicado en el feed", "success");
          onPublished();
        } else {
          showToast("Error al publicar el post", "error");
        }
      }
    } catch {
      showToast(isEditing ? "Error al actualizar la búsqueda" : "Error al publicar el post", "error");
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
      <KeyboardProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? "Editar búsqueda" : "Publicar búsqueda"}
          </Text>
          <View style={{ width: 38 }} />
        </View>

        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          bottomOffset={24}
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
                const active = operaciones.includes(op);
                return (
                  <Chip
                    key={op}
                    label={op.charAt(0).toUpperCase() + op.slice(1)}
                    active={active}
                    onPress={() => toggleOperacion(op)}
                  />
                );
              })}
            </View>
          </SectionCard>

          {/* ── Tipo de propiedad ─────────────────────────── */}
          <SectionCard label="Tipo de propiedad">
            <View style={styles.chipsRow}>
              {TIPO_PROPIEDAD_OPTIONS.map((opt) => {
                const active = tipoPropiedad === opt;
                return (
                  <Chip
                    key={opt}
                    label={opt.charAt(0).toUpperCase() + opt.slice(1)}
                    active={active}
                    onPress={() => {
                      if (active) {
                        setTipoPropiedad("");
                        setSubtipo([]);
                      } else {
                        setTipoPropiedad(opt);
                        setSubtipo([]);
                      }
                    }}
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
            {mostrarVenta && (
              <>
                <Text style={styles.priceGroupLabel}>
                  {mostrarRenta ? "Precio de compra" : "Rango de precio"}
                </Text>
                <View style={[styles.row, { marginTop: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Mínimo"
                      placeholder="Ej. 1,000,000"
                      keyboardType="numeric"
                      value={precioMin}
                      onChangeText={(t) => handleCurrencyChange(t, setPrecioMin)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Máximo"
                      placeholder="Sin límite"
                      keyboardType="numeric"
                      value={precioMax}
                      onChangeText={(t) => handleCurrencyChange(t, setPrecioMax)}
                    />
                  </View>
                </View>
              </>
            )}
            {mostrarRenta && (
              <>
                <Text style={styles.priceGroupLabel}>Precio de renta (mensual)</Text>
                <View style={[styles.row, { marginTop: 8 }]}>
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Mínimo"
                      placeholder="Ej. 8,000"
                      keyboardType="numeric"
                      value={precioRentaMin}
                      onChangeText={(t) => handleCurrencyChange(t, setPrecioRentaMin)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppInput
                      label="Máximo"
                      placeholder="Sin límite"
                      keyboardType="numeric"
                      value={precioRentaMax}
                      onChangeText={(t) => handleCurrencyChange(t, setPrecioRentaMax)}
                    />
                  </View>
                </View>
              </>
            )}
          </SectionCard>

          {/* ── Ubicación (multi-nivel) ──────────────────── */}
          <SectionCard label="Ubicación">
            <MultiLevelLocationPicker
              value={ubicaciones}
              onChange={setUbicaciones}
            />
          </SectionCard>

          {/* ── Características (según tipo) ───────────────── */}
          {(camposVisibles.recamaras ||
            camposVisibles.banos ||
            camposVisibles.estacionamientos ||
            camposVisibles.niveles ||
            camposVisibles.antiguedad) && (
            <SectionCard label="Características">
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
                {camposVisibles.antiguedad && (
                  <View style={styles.fieldFull}>
                    <AppInput
                      label="Antigüedad"
                      placeholder="Ej. Nueva, 5 años…"
                      value={antiguedad}
                      onChangeText={setAntiguedad}
                    />
                  </View>
                )}
              </View>
            </SectionCard>
          )}

          {/* ── Superficies (según tipo) ─────────────────── */}
          {(camposVisibles.m2Terreno || camposVisibles.m2Construccion || isTerreno) && (
            <SectionCard label="Superficies">
              <View style={styles.fieldsWrap}>
                {camposVisibles.m2Terreno && (
                  <View style={styles.fieldHalf}>
                    <AppInput
                      label="m² terreno mín."
                      placeholder="Ej. 200"
                      keyboardType="numeric"
                      value={m2Terreno}
                      onChangeText={(t) => handleCurrencyChange(t, setM2Terreno)}
                    />
                  </View>
                )}
                {camposVisibles.m2Construccion && (
                  <View style={styles.fieldHalf}>
                    <AppInput
                      label="m² construcción mín."
                      placeholder="Ej. 150"
                      keyboardType="numeric"
                      value={m2Construccion}
                      onChangeText={(t) => handleCurrencyChange(t, setM2Construccion)}
                    />
                  </View>
                )}
                {isTerreno && (
                  <>
                    <View style={styles.fieldHalf}>
                      <AppInput
                        label="Ancho (m) mín."
                        placeholder="Ej. 10"
                        keyboardType="numeric"
                        value={anchoTerreno}
                        onChangeText={(t) => handleCurrencyChange(t, setAnchoTerreno)}
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <AppInput
                        label="Largo (m) mín."
                        placeholder="Ej. 25"
                        keyboardType="numeric"
                        value={largoTerreno}
                        onChangeText={(t) => handleCurrencyChange(t, setLargoTerreno)}
                      />
                    </View>
                  </>
                )}
              </View>
            </SectionCard>
          )}

          {/* ── Detalles según tipo (comercial/industrial/agrícola) ── */}
          {tipoPropiedad === "comercial" && (
            <View style={styles.section}>
              <ComercialFiltersSection
                value={comercialFilters ?? initialComercialFilters}
                onUpdate={(key, val) =>
                  setComercialFilters(
                    (prev) =>
                      ({
                        ...(prev ?? initialComercialFilters),
                        [key]: val,
                      }) as ComercialFilters,
                  )
                }
              />
            </View>
          )}
          {tipoPropiedad === "industrial" && (
            <View style={styles.section}>
              <IndustrialFiltersSection
                value={industrialFilters ?? initialIndustrialFilters}
                onUpdate={(key, val) =>
                  setIndustrialFilters(
                    (prev) =>
                      ({
                        ...(prev ?? initialIndustrialFilters),
                        [key]: val,
                      }) as IndustrialFilters,
                  )
                }
              />
            </View>
          )}
          {tipoPropiedad === "agricola" && (
            <View style={styles.section}>
              <AgricolaFiltersSection
                value={agricolaFilters ?? initialAgricolaFilters}
                onUpdate={(key, val) =>
                  setAgricolaFilters(
                    (prev) =>
                      ({
                        ...(prev ?? initialAgricolaFilters),
                        [key]: val,
                      }) as AgricolaFilters,
                  )
                }
              />
            </View>
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
        </KeyboardAwareScrollView>

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
              {publishing
                ? isEditing
                  ? "Actualizando..."
                  : "Publicando..."
                : isEditing
                  ? "Actualizar"
                  : "Publicar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardProvider>
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
  fieldsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  fieldHalf: {
    flexGrow: 1,
    flexBasis: "47%",
  },
  fieldFull: {
    flexBasis: "100%",
    width: "100%",
  },
  priceGroupLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 14,
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
