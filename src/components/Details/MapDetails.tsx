import React, { useMemo, useRef, useState, useDeferredValue } from "react";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "../shared/MapComponents";
import { View, StyleSheet, Text, Platform, Pressable } from "react-native";
import { Property } from "../../types";
import { COLORS } from "../../constants";
import { Globe, MapIcon } from "lucide-react-native";

interface PropertyMapProps {
  property: Property;
  containerStyle?: any;
}

export const MapDetails: React.FC<PropertyMapProps> = ({
  property,
  containerStyle,
}) => {
  const nativeMapRef = useRef<MapView>(null);

  const lat = property.latitud;
  const lng = property.longitud;

  const [mapTypeId, setMapTypeId] = useState<"standard" | "satellite">(
    "standard",
  );
  const deferredMapTypeId = useDeferredValue(mapTypeId);

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

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f3f4f6",
          },
        ]}
      >
        <Text style={{ color: COLORS.textSecondary }}>
          Mapa no disponible en web
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
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
        ref={nativeMapRef}
        mapType={deferredMapTypeId}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        style={styles.map}
        initialRegion={initialRegion}
        moveOnMarkerPress={true}
        scrollEnabled={true}
        zoomEnabled={true}
        liteMode={Platform.OS === "android"}
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
