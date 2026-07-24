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
    padding: 16,
    // Banda a todo el ancho: -16 compensa el padding horizontal del ScrollView
    // (scrollContent) para que el mapa aproveche toda la pantalla.
    marginHorizontal: -16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 5,
    marginBottom: 12,
  },
});
