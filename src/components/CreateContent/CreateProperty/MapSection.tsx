// ============================================
// MapSection - Sección de mapa
// ============================================

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import LocationPicker from "../LocationPicker";
import { COLORS } from "../../../constants/colors";
import { usePropertyFormContext } from "./PropertyFormContext";

export const MapSection = React.memo(function MapSection() {
  const { location, setLocation, mapCenter, isColoniaMode, errors } = usePropertyFormContext();

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
        isColonia={isColoniaMode}
      />
      {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
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
