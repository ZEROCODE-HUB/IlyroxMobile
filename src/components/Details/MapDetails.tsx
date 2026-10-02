import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Linking,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from "../shared/MapComponents";
import { Ionicons } from "@expo/vector-icons";
import { Property } from "../../types";
import { COLORS } from "../../constants";

interface PropertyMapProps {
  property: Property;
  containerStyle?: StyleProp<ViewStyle>;
}

export const MapDetails: React.FC<PropertyMapProps> = ({
  property,
  containerStyle,
}) => {
  const nativeMapRef = useRef<MapView>(null);

  // Extraer y validar coordenadas una sola vez
  const latNum = property.latitud != null ? Number(property.latitud) : NaN;
  const lngNum = property.longitud != null ? Number(property.longitud) : NaN;
  const hasValidCoordinates =
    !isNaN(latNum) && !isNaN(lngNum) && latNum !== 0 && lngNum !== 0;

  // Region inicial — null indica coordenadas no disponibles
  const initialRegion = useMemo(
    () =>
      hasValidCoordinates
        ? {
            latitude: latNum,
            longitude: lngNum,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }
        : null,
    [hasValidCoordinates, latNum, lngNum],
  );

  // Tipo de mapa: "standard" (calle) vs "hybrid" (satélite con etiquetas)
  const [mapTypeId, setMapTypeId] = useState<"standard" | "hybrid">("hybrid");

  // Abrir en app de mapas nativa
  const openInMaps = useCallback(() => {
    const url = Platform.select({
      ios: `maps:0,0?q=${latNum},${lngNum}`,
      android: `geo:${latNum},${lngNum}?q=${latNum},${lngNum}`,
      default: `https://www.google.com/maps/search/?api=1&query=${latNum},${lngNum}`,
    });
    if (url) Linking.openURL(url).catch(() => {});
  }, [latNum, lngNum]);

  // Recentrar mapa animado
  const recenterMap = useCallback(() => {
    if (initialRegion) {
      nativeMapRef.current?.animateToRegion(initialRegion, 600);
    }
  }, [initialRegion]);

  // Web no soporta MapView — mostrar mensaje antes de cualquier otra cosa
  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, containerStyle]}>
        <Text style={styles.unavailableText}>Mapa no disponible en web</Text>
      </View>
    );
  }

  // Coordenadas no disponibles
  if (!initialRegion) {
    return (
      <View style={[styles.container, containerStyle]}>
        <Text style={styles.unavailableText}>Ubicación no disponible</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Botón alternar tipo de mapa */}
      <TouchableOpacity
        style={styles.mapTypeButton}
        onPress={() =>
          setMapTypeId((prev) => (prev === "standard" ? "hybrid" : "standard"))
        }
        activeOpacity={0.7}
      >
        <Text style={styles.mapTypeButtonText}>
          {mapTypeId === "standard" ? "Satélite" : "Mapa"}
        </Text>
      </TouchableOpacity>

      <MapView
        ref={nativeMapRef}
        mapType={mapTypeId}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegion}
        moveOnMarkerPress={false}
        scrollEnabled
        zoomEnabled
        liteMode={Platform.OS === "android"}
      >
        <Marker
          key={property.id}
          coordinate={{ latitude: latNum, longitude: lngNum }}
        />
      </MapView>

      <TouchableOpacity
        style={styles.openMapsButton}
        onPress={openInMaps}
        activeOpacity={0.8}
      >
        <Ionicons name="navigate-outline" size={14} color={COLORS.white} />
        <Text style={styles.openMapsText}>Abrir en mapa</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.recenterButton}
        onPress={recenterMap}
        activeOpacity={0.7}
      >
        <Ionicons name="locate" size={16} color={COLORS.textPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 300,
    backgroundColor: COLORS.white,
    marginVertical: 16,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  unavailableText: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    padding: 20,
  },
  mapTypeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mapTypeButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  openMapsButton: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  openMapsText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
  },
  recenterButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});
