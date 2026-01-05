import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import MapView, {
  Marker,
  Region,
  MapPressEvent,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "../shared/MapComponents";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

interface LocationPickerProps {
  onLocationSelected: (location: {
    latitude: number;
    longitude: number;
  }) => void;
  initialLatitude?: number;
  initialLongitude?: number;
}

export default function LocationPicker({
  onLocationSelected,
  initialLatitude,
  initialLongitude,
}: LocationPickerProps) {
  // Default to Monterrey if no initial location
  const [region, setRegion] = useState<Region>({
    latitude: initialLatitude || 25.6866,
    longitude: initialLongitude || -100.3161,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [marker, setMarker] = useState<{
    latitude: number;
    longitude: number;
  } | null>(
    initialLatitude && initialLongitude
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : null
  );

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ latitude, longitude });
    onLocationSelected({ latitude, longitude });
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
        Toca el mapa o arrastra el pin para establecer la ubicación exacta de la
        propiedad.
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
          <MapView
            style={styles.map}
            initialRegion={region}
            onPress={handleMapPress}
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
                pinColor={COLORS.primary}
              />
            )}
          </MapView>
        )}

        {!marker && Platform.OS !== "web" && (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>
              Toca el mapa para colocar el pin
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
});
