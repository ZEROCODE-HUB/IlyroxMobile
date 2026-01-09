import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../design-system/components/AppInput";
import { COLORS } from "../constants/colors";
import { getUniqueLocations, LocationSuggestion } from "../lib/locationService";

interface LocationSearchBarProps {
  onLocationSelect: (location: LocationSuggestion | null) => void;
  containerStyle?: any;
  topOffset?: number;
}

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  onLocationSelect,
  containerStyle,
  topOffset = 75,
}) => {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar todas las ubicaciones disponibles al montar
  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const locations = await getUniqueLocations();
      setSuggestions(locations);
    } catch (err) {
      console.error("Error fetching locations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSuggestions = suggestions.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectLocation = (location: LocationSuggestion) => {
    setQuery(location.name);
    setShowSuggestions(false);
    onLocationSelect(location);
  };

  const handleClearSearch = () => {
    setQuery("");
    setShowSuggestions(false);
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
      case "ciudad":
        return "business-outline";
      case "municipio":
        return "map-outline";
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
                name="close-circle"
                size={22}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          ) : (
            <Ionicons name="search" size={22} color={COLORS.textTertiary} />
          )
        }
      />

      {showSuggestions && query.trim() && (
        <View style={[styles.suggestionsContainer, { top: topOffset }]}>
          <FlatList
            data={filteredSuggestions.slice(0, 8)}
            keyExtractor={(item, index) => `${item.type}-${item.name}-${index}`}
            keyboardShouldPersistTaps="handled"
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
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionName}>{item.name}</Text>
                  <Text style={styles.suggestionType}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </Text>
                </View>
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
    maxHeight: 320,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    zIndex: 2000,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
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
});
