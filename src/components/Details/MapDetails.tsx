import React, { useMemo, useRef } from "react";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { View, StyleSheet, Text, Platform } from "react-native";
import { Property } from "../../types";
import { COLORS } from "../../constants";

interface PropertyMapProps {
  property: Property;
}

export const MapDetails: React.FC<PropertyMapProps> = ({ property }) => {
  const nativeMapRef = useRef<MapView>(null);

  const lat = property.latitud;
  const lng = property.longitud;

  if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
    return (
      <View style={styles.container}>
        <Text
          style={{
            textAlign: "center",
            padding: 20,
            color: COLORS.textSecondary,
          }}
        >
          Ubicación no disponible
        </Text>
      </View>
    );
  }

  const initialRegion = useMemo(() => {
    return {
      latitude: Number(lat),
      longitude: Number(lng),
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
  }, [lat, lng]);

  return (
    <View style={styles.container}>
      <MapView
        ref={nativeMapRef}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        style={styles.map}
        initialRegion={initialRegion}
        moveOnMarkerPress={true}
        scrollEnabled={true}
        zoomEnabled={true}
        liteMode={true}
      >
        <Marker
          key={property.id}
          coordinate={{ latitude: Number(lat), longitude: Number(lng) }}
        />
      </MapView>
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
    borderColor: "#e2e8f0", // Adding border for better visibility boundaries
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
