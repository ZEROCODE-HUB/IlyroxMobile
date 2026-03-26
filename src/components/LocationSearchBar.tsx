import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../design-system/components/AppInput";
import { COLORS } from "../constants/colors";
import { LocationSuggestion } from "../lib/locationService";
import {
  useLocationSearchStore,
  LocationSuggestionWithCount,
} from "../store/locationSearchStore";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { Image } from "expo-image";

interface LocationSearchBarProps {
  onLocationSelect: (location: LocationSuggestionWithCount | null) => void;
  onSearchingChange?: (val: boolean) => void;
  isHeaderVisible?: boolean;
  containerStyle?: any;
  topOffset?: number;
}

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  onLocationSelect,
  onSearchingChange,
  isHeaderVisible = true,
  containerStyle,
  topOffset = 75,
}) => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [propertySuggestions, setPropertySuggestions] = useState<any[]>([]);

  const router = useRouter();
  const { suggestions, isLoading, searchLocations, clearSuggestions } =
    useLocationSearchStore();

  // Buscar ubicaciones con debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchLocations(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchLocations]);

  // Buscar propiedad por código
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setPropertySuggestions([]);
      return;
    }

    const fetchPropertyByCode = async () => {
      const { data, error } = await supabase
        .from("propiedades")
        .select("id, codigo_propiedad, subtipo, municipio, fotos")
        .ilike("codigo_propiedad", `%${query}%`)
        .limit(3);

      if (!error && data) {
        setPropertySuggestions(
          data.map((p) => ({
            type: "property_code",
            name: p.codigo_propiedad,
            propertyId: p.id,
            subtipo: p.subtipo,
            municipio: p.municipio,
            fotos: p.fotos,
          })),
        );
      } else {
        setPropertySuggestions([]);
      }
    };

    const timer = setTimeout(fetchPropertyByCode, 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    onSearchingChange?.(showSuggestions);
  }, [showSuggestions, onSearchingChange]);

  // Cerrar sugerencias si el header desaparece
  useEffect(() => {
    if (!isHeaderVisible) {
      setShowSuggestions(false);
    }
  }, [isHeaderVisible]);

  const handleSelectLocation = (location: any) => {
    if (location.type === "property_code") {
      setShowSuggestions(false);
      router.push({
        pathname: "/(stack)/property/[id]",
        params: { id: location.propertyId },
      });
      return;
    }
    setQuery(location.name);
    setShowSuggestions(false);
    onLocationSelect(location as LocationSuggestionWithCount);
  };

  const handleClearSearch = () => {
    setQuery("");
    setShowSuggestions(false);
    setPropertySuggestions([]);
    clearSuggestions();
    onLocationSelect(null);
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    setShowSuggestions(!!text.trim());
    if (!text.trim()) {
      onLocationSelect(null);
    }
  };

  const getIconName = (type: string) => {
    switch (type) {
      case "estado":
        return "map-outline";
      case "municipio":
        return "business-outline";
      case "colonia":
        return "location-outline";
      case "property_code":
        return "home-outline";
      default:
        return "location-outline";
    }
  };

  return (
    <>
      <AppInput
        containerStyle={[styles.searchWrapper, containerStyle]}
        placeholder="Ingresa una ubicación..."
        value={query}
        onChangeText={handleChangeText}
        onFocus={() => {
          if (query.trim()) setShowSuggestions(true);
        }}
        onBlur={() => {
          // Delay para permitir el click en sugerencias
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="search"
        rightIcon={
          query.length > 0 ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons
                name="close-circle-outline"
                size={22}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          ) : (
            <Ionicons
              name="search-outline"
              size={22}
              color={COLORS.textTertiary}
            />
          )
        }
      />

      {showSuggestions && query.trim() && (
        <View
          pointerEvents="auto"
          style={[styles.suggestionsContainer, { top: topOffset }]}
        >
          <FlatList
            data={[...propertySuggestions, ...suggestions]}
            keyExtractor={(item, index) =>
              `${(item as any).type}-${(item as any).name}-${index}`
            }
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
            style={{ flexGrow: 0 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectLocation(item)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionIconContainer}>
                  <Ionicons
                    name={getIconName(item.type)}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </View>
                <View style={[styles.suggestionTextContainer, { flex: 1 }]}>
                  <Text style={styles.suggestionName}>{item.name}</Text>
                  <Text style={styles.suggestionType}>Propiedad</Text>
                  {item.type === "colonia" && (
                    <Text style={styles.propertyCountText}>
                      {(item as any).municipio_nombre
                        ? `${(item as any).municipio_nombre} • `
                        : ""}
                      {(item as any).propertyCount || 0}{" "}
                      {(item as any).propertyCount === 1
                        ? "propiedad"
                        : "propiedades"}
                    </Text>
                  )}
                  {item.type === "property_code" && (
                    <Text style={styles.propertyCountText}>
                      {(item as any).subtipo} • {(item as any).municipio}
                    </Text>
                  )}
                </View>
                {item.fotos && item.fotos.length > 0 && (
                  <View style={styles.suggestionImageContainer}>
                    <Image
                      source={item.fotos[0]}
                      style={{ width: 55, height: 55 }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.suggestionItem}>
                <View style={styles.suggestionIconContainer}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </View>
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionName}>
                    {isLoading
                      ? "Cargando ubicaciones..."
                      : "No se encontraron ubicaciones"}
                  </Text>
                  <Text style={styles.suggestionType}>
                    {isLoading
                      ? "Espera un momento"
                      : "Intenta con otro término"}
                  </Text>
                </View>
              </View>
            }
          />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  searchWrapper: {
    marginBottom: 0,
  },
  suggestionsContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
    maxHeight: 350,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    zIndex: 3000,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    width: "100%",
  },
  suggestionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  suggestionType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: "capitalize",
  },
  propertyCountText: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
    fontWeight: "500",
  },
  suggestionImageContainer: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
});
