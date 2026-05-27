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
import { searchPlaces, getPlaceDetails, reverseGeocode, type PlaceSuggestion } from "../../lib/geocodingService";

export interface LocationData {
  estado: string;
  ciudad: string;
  municipio: string;
  colonia: string;
  colonias?: string[];
  latitud?: number;
  longitud?: number;
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
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.estado, initialData?.municipio, initialData?.colonia]);

  // Debounce para el autocompletado
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setIsSelected(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchPlaces(text, sessionTokenRef.current);
        setSuggestions(results.slice(0, 8));
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  const handleSelectSuggestion = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setSuggestions([]);
      setIsLoading(true);
      setQuery(suggestion.description);

      try {
        // Obtener geometría exacta del lugar
        const details = await getPlaceDetails(suggestion.placeId, sessionTokenRef.current);

        // Refrescar session token después de completar una selección
        sessionTokenRef.current = generateToken();

        const lat = details?.location.lat ?? 0;
        const lng = details?.location.lng ?? 0;

        // Reverse geocoding para extraer estado/municipio/colonia
        let estado = "";
        let municipio = "";
        let ciudad = "";
        let colonia = "";

        if (lat && lng) {
          const geo = await reverseGeocode(lat, lng);
          if (geo) {
            estado = geo.components.estado;
            municipio = geo.components.municipio;
            ciudad = geo.components.ciudad;
            colonia = geo.components.colonia;
          }
        }

        // Fallback: parsear desde la descripción de la sugerencia si Reverse Geocoding falla
        if (!estado) {
          const parts = suggestion.description
            .replace(/, México$/, "")
            .replace(/, Mexico$/, "")
            .split(", ")
            .map((s) => s.trim());
          estado = parts[parts.length - 1] ?? "";
          municipio = parts[parts.length - 2] ?? "";
          colonia = parts[0] ?? "";
          ciudad = municipio;
        }

        const newData: LocationData = {
          estado,
          ciudad,
          municipio,
          colonia,
          colonias: colonia ? [colonia] : [],
          latitud: lat || undefined,
          longitud: lng || undefined,
        };

        setCurrentData(newData);
        setIsSelected(true);
        onChange(newData);
      } catch (e) {
        console.warn("[CascadeLocationSelector] handleSelectSuggestion error:", e);
      } finally {
        setIsLoading(false);
      }
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
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
