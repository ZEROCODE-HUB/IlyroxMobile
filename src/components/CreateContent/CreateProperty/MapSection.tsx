// ============================================
// MapSection - Sección de mapa
// ============================================

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import LocationPicker from "../LocationPicker";
import { COLORS } from "../../../constants/colors";
import type { LocationCoords, MapCenter } from "./types";

interface MapSectionProps {
  location: LocationCoords;
  setLocation: (loc: LocationCoords) => void;
  mapCenter: MapCenter | null;
  isColonia?: boolean;
  error?: string;
}

export const MapSection = React.memo(function MapSection({
  location,
  setLocation,
  mapCenter,
  isColonia = false,
  error,
}: MapSectionProps) {
  return (
    <View style={[styles.section, { paddingBottom: 50 }]}>
      <LocationPicker
        onLocationSelected={setLocation}
        selectedLocation={
          location.latitude !== 0 && location.longitude !== 0 ? location : null
        }
        focusLocation={
          mapCenter
            ? { latitude: mapCenter.lat, longitude: mapCenter.lng }
            : null
        }
        isColonia={isColonia}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 5,
    marginBottom: 12,
  },
});
