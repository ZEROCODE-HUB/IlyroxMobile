import React, { useState, useRef, useEffect } from "react";
import { View, ScrollView, StyleSheet, Modal, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Property } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { AppHeader } from "../../components/AppHeader";
import { SearchFiltersBar } from "./SearchFiltersBar";
import { PropertyMap } from "./PropertyMap";
import { PropertyMapCard } from "./PropertyMapCard";
import { SearchFiltersModal } from "./SearchFiltersModal";
import { usePropertyFilters } from "../../hooks/usePropertyFilters";
import { SafeAreaView } from "react-native-safe-area-context";

interface MapSearchProps {
  properties: Property[];
  onSaveSearch: (name: string, leadName?: string, leadPhone?: string) => void;
}

const MapSearch: React.FC<MapSearchProps> = ({ properties, onSaveSearch }) => {
  const { user } = useAuth();
  const { selectedLocation, setSelectedLocation } = useApp();
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollView>(null);

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<
    string | null
  >(null);
  const [selectedPropertyForDetail, setSelectedPropertyForDetail] = useState<
    string | null
  >(null);

  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const {
    filters,
    filteredProperties,
    updateFilter,
    updateLocationFilter,
    clearFilters,
    hasActiveFilters,
  } = usePropertyFilters(properties);

  // LOG INICIAL - Ver propiedades recibidas
  useEffect(() => {
    console.log("=== MAPSEARCH MOUNTED ===");
    console.log("Total propiedades recibidas:", properties.length);

    if (properties.length > 0) {
      console.log("Primera propiedad (estructura completa):");
      console.log(JSON.stringify(properties[0], null, 2));

      console.log("\nCampos de ubicación de las primeras 3 propiedades:");
      properties.slice(0, 3).forEach((p, idx) => {
        const anyP = p as any;
        console.log(`\nPropiedad ${idx + 1}:`);
        console.log("  - location?.city:", p.location?.city);
        console.log("  - location?.municipio:", p.location?.municipio);
        console.log("  - ciudad (directo):", anyP.ciudad);
        console.log("  - municipio (directo):", anyP.municipio);
        console.log("  - coordenadas:", {
          lat: p.coordinates?.lat || anyP.latitud,
          lng: p.coordinates?.lng || anyP.longitud,
        });
      });
    }

    console.log("selectedLocation inicial:", selectedLocation);
    console.log("========================\n");
  }, []);

  // INICIALIZAR FILTROS CON selectedLocation
  useEffect(() => {
    if (selectedLocation) {
      console.log("=== INICIALIZANDO CON UBICACIÓN SELECCIONADA ===");
      console.log("selectedLocation:", JSON.stringify(selectedLocation));
      console.log("name:", selectedLocation.name);
      console.log("type:", selectedLocation.type);

      // Crear filtro de ubicación según el tipo
      const newLocationFilter = {
        estado: "",
        ciudad: "",
        municipio: "",
        colonia: "",
      };

      // Actualizar el campo correcto según el tipo de ubicación
      if (selectedLocation.type === "ciudad") {
        newLocationFilter.ciudad = selectedLocation.name;
      } else if (selectedLocation.type === "municipio") {
        newLocationFilter.municipio = selectedLocation.name;
      } else if (selectedLocation.type === "colonia") {
        newLocationFilter.colonia = selectedLocation.name;
      } else if (selectedLocation.type === "estado") {
        newLocationFilter.estado = selectedLocation.name;
      } else {
        // Por defecto, asumir que es ciudad
        console.log("Tipo desconocido, asumiendo ciudad");
        newLocationFilter.ciudad = selectedLocation.name;
      }

      console.log("Aplicando filtro de ubicación:", newLocationFilter);
      updateLocationFilter(newLocationFilter);
    } else {
      console.log("=== NO HAY UBICACIÓN SELECCIONADA ===");
      console.log("Mostrando todas las propiedades sin filtro de ubicación");
    }
  }, [selectedLocation]);

  // Manejar click en marker del mapa
  const handleMarkerPress = (propertyId: string, property: Property) => {
    // Resaltar card
    setHighlightedPropertyId(propertyId);

    // Scroll a la card correspondiente
    const propertyIndex = filteredProperties.findIndex(
      (p) => p.id === propertyId
    );
    if (propertyIndex !== -1 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: propertyIndex * 212, // 200 width + 12 margin
        animated: true,
      });
    }

    // Después de 1 segundo, abrir detalles
    setTimeout(() => {
      setHighlightedPropertyId(null);
      navigation.navigate("PropertyDetail", { propertyId });
    }, 1000);
  };

  // Manejar click en card
  const handleCardPress = (propertyId: string) => {
    navigation.navigate("PropertyDetail", { propertyId });
  };

  // Limpiar filtros incluyendo ubicación
  const handleClearAll = () => {
    clearFilters();
    setSelectedLocation(null);
  };

  // Obtener primera imagen de la propiedad
  const getPropertyImage = (property: Property): string => {
    const anyP = property as any;

    if (property.images && property.images.length > 0) {
      return property.images[0];
    }

    if (anyP.fotos) {
      if (Array.isArray(anyP.fotos) && anyP.fotos.length > 0) {
        return anyP.fotos[0];
      }
      if (typeof anyP.fotos === "string") {
        try {
          const parsed = JSON.parse(anyP.fotos);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed[0];
          }
        } catch {
          // Si no es JSON, puede ser una URL directa o lista separada por comas
          if (anyP.fotos.includes(",")) {
            return anyP.fotos.split(",")[0].trim();
          }
          return anyP.fotos;
        }
      }
    }

    // Imagen por defecto
    return "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1080&q=80";
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Buscar Propiedades"
        showBackButton
        onBack={() => navigation.goBack()}
      />

      <SearchFiltersBar
        hasActiveFilters={hasActiveFilters}
        onOpenFilters={() => setShowFiltersModal(true)}
        onClearFilters={handleClearAll}
      />

      {/* Mapa - 65% de la altura */}
      <View style={styles.mapContainer}>
        <PropertyMap
          properties={filteredProperties}
          onMarkerPress={handleMarkerPress}
          googleApiKey={googleApiKey}
          highlightedPropertyId={highlightedPropertyId}
        />
      </View>

      {/* Lista horizontal de cards - 35% de la altura */}
      <View style={styles.cardsContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContent}
          decelerationRate="fast"
          snapToInterval={212} // 200 + 12 margin
        >
          {filteredProperties.map((property) => (
            <PropertyMapCard
              key={property.id}
              id={property.id}
              title={property.title || "Propiedad"}
              price={property.price || 0}
              currency={filters.moneda}
              image={getPropertyImage(property)}
              isHighlighted={property.id === highlightedPropertyId}
              onPress={() => handleCardPress(property.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Modal de filtros */}
      <SearchFiltersModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        filters={filters}
        onUpdateFilter={updateFilter}
        onUpdateLocationFilter={updateLocationFilter}
        filteredPropertiesCount={filteredProperties.length}
        userId={user?.id}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    flex: 0.7, // 70% del espacio (antes era 65%)
  },
  cardsContainer: {
    flex: 0.3, // 30% del espacio (antes era 35%)
    backgroundColor: "#f8f9fa",
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
    paddingVertical: 16,
  },
  cardsContent: {
    paddingHorizontal: 16,
  },
});

export default MapSearch;
