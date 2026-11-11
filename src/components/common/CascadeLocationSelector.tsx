/**
 * CascadeLocationSelector.tsx
 *
 * Selector de ubicación basado en Google Places Autocomplete.
 * Reemplaza el antiguo selector cascada Estado → Municipio → Colonia
 * que dependía de Supabase Geo.
 *
 * Flujo:
 * 1. Usuario escribe una dirección/zona
 * 2. Se consulta Places Autocomplete API → sugerencias
 * 3. Usuario selecciona → se obtienen detalles del lugar (lat/lng)
 * 4. Se hace Reverse Geocoding para extraer estado/municipio/colonia
 * 5. Se llama onChange con los datos estructurados
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { searchPlaces, getPlaceDetails, reverseGeocode, derivePlaceType, type PlaceSuggestion, type GeoBounds } from "../../lib/geocodingService";
import { getCountryConfig, DEFAULT_COUNTRY } from "../../lib/location/registry";
import { priorizarEstado } from "../../lib/location/estadoFirst";
import { useLocationSearchStore } from "../../store/locationSearchStore";
import { useAuth } from "../../context/AuthContext";
import type { CountryCode } from "../../lib/location/types";

export interface LocationData {
  estado: string;
  ciudad: string;
  municipio: string;
  colonia: string;
  colonias?: string[];
  /** Código de país ISO detectado de la ubicación (default: MX). */
  pais?: CountryCode;
  latitud?: number;
  longitud?: number;
  /** Bounds (área) del lugar elegido en Google Places, para validar el PIN. */
  bounds?: GeoBounds;
  /** Nivel del lugar elegido (estado/municipio/colonia). */
  placeType?: "estado" | "municipio" | "colonia";
}

interface CascadeLocationSelectorProps {
  initialData?: Partial<LocationData>;
  onChange: (data: LocationData) => void;
  showColonia?: boolean;
  isMandatory?: boolean;
  /** multiColonia se mantiene en la firma para compatibilidad, pero en Places solo habrá una colonia por predicción */
  multiColonia?: boolean;
  placeholder?: string;
}

export default function CascadeLocationSelector({
  initialData,
  onChange,
  isMandatory = true,
  placeholder = "Buscar dirección o zona...",
}: CascadeLocationSelectorProps) {
  // Valor en el input de texto
  const [query, setQuery] = useState(
    initialData
      ? [initialData.colonia, initialData.municipio, initialData.estado]
          .filter(Boolean)
          .join(", ")
      : "",
  );
  // Sugerencias de Places Autocomplete
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // REV27 (#2): se usa el MISMO buscador de ubicaciones que el buscador general (mismo orden: estado primero,
  // zonas con propiedades, nombres canonicos, ruido filtrado).
  const { profile: perfilUsuario } = useAuth();
  const storeSugs = useLocationSearchStore((s) => s.suggestions);
  const buscarEnStore = useLocationSearchStore((s) => s.searchLocations);
  const limpiarStore = useLocationSearchStore((s) => s.clearSuggestions);
  const escribiendoRef = useRef(false);
  const origenRef = useRef<Map<string, any>>(new Map());
  // Indica que ya hay una selección válida (no mostrar sugerencias)
  const [isSelected, setIsSelected] = useState(!!initialData?.estado);

  // Session token para agrupar requests y reducir costos de Places API
  const sessionTokenRef = useRef<string>(generateToken());

  // Datos seleccionados actualmente
  const [currentData, setCurrentData] = useState<LocationData>({
    estado: initialData?.estado ?? "",
    ciudad: initialData?.ciudad ?? "",
    municipio: initialData?.municipio ?? "",
    colonia: initialData?.colonia ?? "",
    colonias: initialData?.colonias ?? (initialData?.colonia ? [initialData.colonia] : []),
    latitud: initialData?.latitud,
    longitud: initialData?.longitud,
  });

  // Sincronizar si initialData cambia asincrónicamente (modo edición)
  useEffect(() => {
    if (!initialData) return;
    const newQuery = [initialData.colonia, initialData.municipio, initialData.estado]
      .filter(Boolean)
      .join(", ");
    if (newQuery && newQuery !== query) {
      setQuery(newQuery);
      setIsSelected(true);
      setCurrentData({
        estado: initialData.estado ?? "",
        ciudad: initialData.ciudad ?? "",
        municipio: initialData.municipio ?? "",
        colonia: initialData.colonia ?? "",
        colonias: initialData.colonias ?? (initialData.colonia ? [initialData.colonia] : []),
        latitud: initialData.latitud,
        longitud: initialData.longitud,
        bounds: initialData.bounds,
        placeType: initialData.placeType,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.estado, initialData?.municipio, initialData?.colonia]);

  // REV27 (#2): al abrir/cerrar, no arrastrar sugerencias de otra pantalla (buscador general o del mapa).
  useEffect(() => {
    limpiarStore();
    return () => limpiarStore();
  }, [limpiarStore]);

  // REV27 (#2): lo que devuelve el buscador general se muestra tal cual, en su mismo orden.
  useEffect(() => {
    if (!escribiendoRef.current || storeSugs.length === 0) return;
    const mapa = new Map<string, any>();
    const lista: PlaceSuggestion[] = storeSugs.map((s: any) => {
      mapa.set(s.placeId, s);
      return {
        placeId: s.placeId,
        description: s.fullDescription || [s.name, s.secondaryText].filter(Boolean).join(", "),
        mainText: s.name,
        secondaryText: s.secondaryText ?? "",
        types:
          s.types && s.types.length > 0
            ? s.types
            : [s.type === "estado" ? "administrative_area_level_1" : s.type === "municipio" ? "locality" : "sublocality"],
      };
    });
    origenRef.current = mapa;
    setSuggestions(lista.slice(0, 8));
    setIsLoading(false);
  }, [storeSugs]);

  // Debounce para el autocompletado
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // REV24: numero de la busqueda vigente; una respuesta lenta de una busqueda anterior no pisa a la nueva.
  const busquedaRef = useRef(0);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setIsSelected(false);
    busquedaRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      escribiendoRef.current = false;
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      const miBusqueda = busquedaRef.current;
      try {
        escribiendoRef.current = true;
        // Mismos parametros que usa el buscador general (useSearch).
        await buscarEnStore(text, undefined, {
          restrictToRegions: false,
          withCounts: false,
          estado: perfilUsuario?.estado,
        });
        if (miBusqueda !== busquedaRef.current) return;
        // Respaldo: si el buscador general no devolvio nada, se usa la busqueda directa de antes.
        if (useLocationSearchStore.getState().suggestions.length === 0) {
          const results = await searchPlaces(text, sessionTokenRef.current);
          const ordenados = await priorizarEstado(text, results, sessionTokenRef.current);
          if (miBusqueda !== busquedaRef.current) return;
          origenRef.current = new Map();
          setSuggestions(ordenados.slice(0, 8));
        }
      } catch {
        if (miBusqueda === busquedaRef.current) setSuggestions([]);
      } finally {
        if (miBusqueda === busquedaRef.current) setIsLoading(false);
      }
    }, 300);
  }, [buscarEnStore, perfilUsuario?.estado]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setSuggestions([]);
      setIsLoading(true);
      setQuery(suggestion.description);
      escribiendoRef.current = false;

      try {
        // REV27 (#2): zonas que vienen de las propiedades de la BD (id "prop-...") no existen en Google Places:
        // se usa su nombre y su centroide directamente.
        const origen = origenRef.current.get(suggestion.placeId);
        if (suggestion.placeId.startsWith("prop-") && origen) {
          const tipoZona = origen.type as "estado" | "municipio" | "colonia";
          const datos: LocationData = {
            estado: tipoZona === "estado" ? origen.name : (origen.estado_nombre ?? ""),
            ciudad: tipoZona === "estado" ? "" : (origen.municipio_nombre ?? (tipoZona === "municipio" ? origen.name : "")),
            municipio: tipoZona === "estado" ? "" : (tipoZona === "municipio" ? origen.name : (origen.municipio_nombre ?? "")),
            colonia: tipoZona === "colonia" ? origen.name : "",
            colonias: tipoZona === "colonia" ? [origen.name] : [],
            pais: DEFAULT_COUNTRY,
            latitud: origen.centroide?.lat,
            longitud: origen.centroide?.lng,
            placeType: tipoZona,
          };
          sessionTokenRef.current = generateToken();
          limpiarStore();
          setCurrentData(datos);
          setIsSelected(true);
          onChange(datos);
          return;
        }

        // Obtener geometría exacta del lugar
        const details = await getPlaceDetails(suggestion.placeId, sessionTokenRef.current);

        // Refrescar session token después de completar una selección
        sessionTokenRef.current = generateToken();

        const lat = details?.location.lat ?? 0;
        const lng = details?.location.lng ?? 0;

        // Reverse geocoding para extraer estado/municipio/colonia y detectar el país
        let estado = "";
        let municipio = "";
        let ciudad = "";
        let colonia = "";
        let pais: CountryCode = DEFAULT_COUNTRY;

        if (lat && lng) {
          const geo = await reverseGeocode(lat, lng);
          if (geo) {
            estado = geo.components.estado;
            municipio = geo.components.municipio;
            ciudad = geo.components.ciudad;
            colonia = geo.components.colonia;
            pais = geo.country;
          }
        }

        // Fallback: parsear desde la descripción de la sugerencia si Reverse Geocoding falla
        if (!estado) {
          const config = getCountryConfig(DEFAULT_COUNTRY);
          let desc = suggestion.description.trim();
          for (const suffix of config.countrySuffixes) {
            desc = desc.replace(new RegExp(`,\\s*${suffix}\\s*$`, "i"), "");
          }
          const parts = desc.split(",").map((s) => s.trim()).filter(Boolean);
          estado = parts[parts.length - 1] ?? "";
          municipio = parts[parts.length - 2] ?? "";
          colonia = parts[0] ?? "";
          ciudad = municipio;
        }

        // El reverse geocoding parte del centroide y tiende a "sobre-especificar":
        // para una predicción a nivel estado o municipio devuelve también un
        // municipio/colonia puntuales, sustituyendo lo que el usuario eligió. Recortamos
        // la jerarquía al nivel real de la predicción y hacemos prevalecer el nombre
        // que el usuario vio en la sugerencia (mainText).
        const placeType = derivePlaceType(suggestion.types);
        const mainName = suggestion.mainText?.trim() ?? "";
        if (placeType === "estado") {
          estado = mainName || estado;
          municipio = "";
          ciudad = "";
          colonia = "";
        } else if (placeType === "municipio") {
          municipio = mainName || municipio;
          colonia = "";
        } else {
          colonia = mainName || colonia;
        }

        const newData: LocationData = {
          estado,
          ciudad,
          municipio,
          colonia,
          colonias: colonia ? [colonia] : [],
          pais,
          latitud: lat || undefined,
          longitud: lng || undefined,
          bounds: details?.bounds,
          placeType,
        };

        limpiarStore();
        setCurrentData(newData);
        setIsSelected(true);
        onChange(newData);
      } catch (e) {
        console.warn("[CascadeLocationSelector] handleSelectSuggestion error:", e);
      } finally {
        setIsLoading(false);
      }
    },
    [onChange, limpiarStore],
  );

  const handleClear = useCallback(() => {
    escribiendoRef.current = false;
    limpiarStore();
    setQuery("");
    setIsSelected(false);
    setSuggestions([]);
    const empty: LocationData = {
      estado: "",
      ciudad: "",
      municipio: "",
      colonia: "",
      colonias: [],
      latitud: undefined,
      longitud: undefined,
    };
    setCurrentData(empty);
    onChange(empty);
    sessionTokenRef.current = generateToken();
  }, [onChange]);

  const isEmpty = !currentData.estado && !currentData.municipio;

  return (
    <View style={styles.container}>
      {/* Input de búsqueda */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Ubicación{isMandatory ? " *" : ""}
        </Text>
        <View
          style={[
            styles.inputContainer,
            isMandatory && isEmpty && styles.inputContainerEmpty,
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={COLORS.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={handleQueryChange}
            placeholder={placeholder}
            placeholderTextColor={COLORS.primary}
            returnKeyType="search"
            autoCorrect={false}
          />
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={styles.inputAction} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={handleClear} hitSlop={8} style={styles.inputAction}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Lista de sugerencias — View plano sin maxHeight para que el ScrollView
          externo del formulario maneje el scroll. Evita el problema de scroll
          anidado en React Native. */}
      {suggestions.length > 0 && !isSelected && (
        <View style={styles.suggestionsList}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={item.placeId}
              style={[
                styles.suggestionItem,
                index === suggestions.length - 1 && styles.suggestionItemLast,
              ]}
              onPress={() => handleSelectSuggestion(item)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="location-outline"
                size={16}
                color={COLORS.primary}
                style={styles.suggestionIcon}
              />
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionMain} numberOfLines={1}>
                  {item.mainText}
                </Text>
                {item.secondaryText ? (
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {item.secondaryText}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Resumen de la ubicación seleccionada */}
      {isSelected && currentData.estado && (
        <View style={styles.selectedSummary}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success ?? COLORS.primary} />
          <Text style={styles.selectedSummaryText} numberOfLines={1}>
            {[currentData.colonia, currentData.municipio, currentData.estado]
              .filter(Boolean)
              .join(", ")}
          </Text>
        </View>
      )}
    </View>
  );
}

function generateToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  field: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  inputContainer: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputContainerEmpty: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTransparent,
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  inputAction: {
    flexShrink: 0,
  },
  suggestionsList: {
    backgroundColor: COLORS.white ?? COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
    gap: 10,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIcon: {
    flexShrink: 0,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  suggestionSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  selectedSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  selectedSummaryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
