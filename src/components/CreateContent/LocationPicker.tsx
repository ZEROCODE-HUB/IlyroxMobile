import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import * as Haptics from "expo-haptics";
import MapView, {
  Marker,
  Region,
  LongPressEvent,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "../shared/MapComponents";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { Globe, MapIcon } from "lucide-react-native";

interface LocationPickerProps {
  onLocationSelected: (location: {
    latitude: number;
    longitude: number;
  }) => void;
  // Coordenadas para el PIN (si existe)
  selectedLocation?: { latitude: number; longitude: number } | null;
  // Coordenadas para enfocar el mapa (sin poner pin necesariamente)
  focusLocation?: { latitude: number; longitude: number } | null;
  isColonia?: boolean;
}

export default function LocationPicker({
  onLocationSelected,
  selectedLocation,
  focusLocation,
  isColonia = false,
}: LocationPickerProps) {
  /* eslint-disable react-hooks/exhaustive-deps */
  const mapRef = React.useRef<MapView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const pendingCoords = React.useRef<{
    lat: number;
    lng: number;
    isColonia: boolean;
  } | null>(null);

  const [mapTypeId, setMapTypeId] = useState<"standard" | "satellite">(
    "satellite",
  );

  const [region, setRegion] = useState<Region>({
    latitude: selectedLocation?.latitude || focusLocation?.latitude || 25.6866,
    longitude:
      selectedLocation?.longitude || focusLocation?.longitude || -100.3161,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  const [marker, setMarker] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    selectedLocation && selectedLocation.latitude !== 0
      ? selectedLocation
      : null,
  );

  const getDeltas = (coloniaMode: boolean) => {
    return {
      latitudeDelta: coloniaMode ? 0.01 : 0.5, // 0.01 para colonias, 0.5 para estados
      longitudeDelta: coloniaMode ? 0.01 : 0.5,
    };
  };

  // Actualizar región y marcador si cambian las props iniciales (ej. al seleccionar Estado)
  // Efecto para enfocar el mapa cuando cambia focusLocation
  useEffect(() => {
    if (focusLocation) {
      const newRegion = {
        latitude: focusLocation.latitude,
        longitude: focusLocation.longitude,
        ...getDeltas(isColonia),
      };
      setRegion(newRegion);
      if (isMapReady) {
        mapRef.current?.animateToRegion(newRegion, 1000);
      } else {
        pendingCoords.current = {
          lat: focusLocation.latitude,
          lng: focusLocation.longitude,
          isColonia,
        };
      }
    }
  }, [focusLocation?.latitude, focusLocation?.longitude, isMapReady]);

  // Efecto para actualizar el marcador si la prop externa cambia
  useEffect(() => {
    if (selectedLocation && selectedLocation.latitude !== 0) {
      setMarker(selectedLocation);
    }
  }, [selectedLocation]);

  const handleMapReady = () => {
    setIsMapReady(true);
    if (pendingCoords.current) {
      const deltas = getDeltas(pendingCoords.current.isColonia);
      const targetRegion = {
        latitude: pendingCoords.current.lat,
        longitude: pendingCoords.current.lng,
        ...deltas,
      };
      mapRef.current?.animateToRegion(targetRegion, 1000);
      pendingCoords.current = null;
    }
  };

  const handleMapPress = (e: LongPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
    onLocationSelected({ latitude, longitude });

    // Feedback háptico "Premium" al seleccionar
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
    onLocationSelected({ latitude, longitude });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="map" size={24} color={COLORS.primary} />
        <Text style={styles.title}>Ubicación Exacta</Text>
      </View>
      <Text style={styles.subtitle}>
        <Ionicons name="warning" size={16} color={COLORS.textSecondary} />{" "}
        Mantén presionado el mapa para marcar la ubicación.
      </Text>

      <View style={styles.mapContainer}>
        {Platform.OS === "web" ? (
          <View style={styles.webPlaceholder}>
            <Text style={styles.webText}>
              Mapa no disponible en web por el momento
            </Text>
            <Text style={styles.webSubtext}>
              Ingresa las coordenadas manualmente si es necesario
            </Text>
          </View>
        ) : (
          <>
            <Pressable
              style={styles.mapTypeButton}
              onPress={() =>
                setMapTypeId(
                  mapTypeId === "standard" ? "satellite" : "standard",
                )
              }
            >
              {mapTypeId === "standard" ? (
                <View style={styles.mapTypeButtonIcon}>
                  <Globe size={10} />
                  <Text style={styles.mapTypeButtonText}>Satélite</Text>
                </View>
              ) : (
                <View style={styles.mapTypeButtonIcon}>
                  <MapIcon size={10} />
                  <Text style={styles.mapTypeButtonText}>Mapa</Text>
                </View>
              )}
            </Pressable>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={region}
              mapType={mapTypeId}
              onLongPress={handleMapPress}
              onMapReady={handleMapReady}
              provider={
                Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
              }
            >
              {marker && (
                <Marker
                  coordinate={marker}
                  draggable
                  onDragEnd={handleDragEnd}
                  title="Ubicación de la propiedad"
                  pinColor={COLORS.primaryDark}
                />
              )}
            </MapView>
          </>
        )}

        {!marker && Platform.OS !== "web" && (
          <View style={styles.overlay} pointerEvents="none">
            <Text style={styles.overlayText}>
              Mantén presionado para colocar el pin
            </Text>
          </View>
        )}
      </View>

      {marker && (
        <View style={styles.coordsContainer}>
          <Text style={styles.coordsText}>
            Lat: {marker.latitude.toFixed(6)}, Long:{" "}
            {marker.longitude.toFixed(6)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    position: "relative",
    backgroundColor: COLORS.background,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  webPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  webText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  webSubtext: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  overlay: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    backgroundColor: COLORS.blackTransparent80,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  overlayText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  coordsContainer: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  coordsText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  mapTypeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mapTypeButtonIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapTypeButtonText: {
    fontSize: 10,
    fontWeight: "bold",
  },
});
