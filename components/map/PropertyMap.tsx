import React, { useRef, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";

import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "../shared/MapComponents";
import { Property } from "../../types";
import { COLORS } from "../../constants/colors";
import { useStableSafeInsets } from "../../context/SafeInsetsContext";

interface PropertyMapProps {
  properties: Property[];
  onMarkerPress: (propertyId: string, property: Property) => void;
  googleApiKey?: string;
  highlightedPropertyId?: string | null;
  focusRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties,
  onMarkerPress,
  googleApiKey,
  highlightedPropertyId,
  focusRegion,
}) => {
  const { bottom } = useStableSafeInsets();
  const mapRef = useRef<any>(null);
  const nativeMapRef = useRef<MapView>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [overlayPositions, setOverlayPositions] = useState<{
    [key: string]: { x: number; y: number };
  }>({});

  const updateOverlayPositions = async () => {
    if (
      Platform.OS === "web" ||
      !nativeMapRef.current ||
      properties.length === 0
    )
      return;

    const newPositions: any = {};
    const promises = properties.map(async (p) => {
      const lat = p.coordinates?.lat || (p as any).latitud;
      const lng = p.coordinates?.lng || (p as any).longitud;

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        try {
          const point = await nativeMapRef.current.pointForCoordinate({
            latitude: Number(lat),
            longitude: Number(lng),
          });
          newPositions[p.id] = point;
        } catch (e) {
          // ignore errors during projection
        }
      }
    });

    await Promise.all(promises);
    setOverlayPositions(newPositions);
  };

  useEffect(() => {
    if (mapReady) {
      updateOverlayPositions();
    }
  }, [properties, mapReady]);

  const formatPrice = (price: number): string => {
    if (price === 0) return "$0"; // Asegurar que el 0 se muestre
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${Math.round(price / 1000)}k`;
    }
    return `$${price}`;
  };

  const calculateRegionWithPadding = () => {
    if (properties.length === 0) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    properties.forEach((p) => {
      const lat = p.coordinates?.lat || (p as any).latitud;
      const lng = p.coordinates?.lng || (p as any).longitud;

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    });

    if (minLat === Infinity) return null;

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    // Calcular deltas base
    let latDelta = maxLat - minLat;
    let lngDelta = maxLng - minLng;

    // Si las propiedades están muy cerca, establecer un mínimo
    latDelta = Math.max(latDelta, 0.02);
    lngDelta = Math.max(lngDelta, 0.02);

    // Multiplicar por 3 para dar MUCHO espacio a los marcadores
    latDelta *= 3;
    lngDelta *= 3;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  useEffect(() => {
    if (Platform.OS === "web" || !nativeMapRef.current || !mapReady) return;
    // Priorizar enfoque explícito si está definido
    if (focusRegion) {
      nativeMapRef.current?.animateToRegion(focusRegion, 700);
      return;
    }
    if (properties.length === 0) return;

    const region = calculateRegionWithPadding();

    if (region) {
      setTimeout(() => {
        nativeMapRef.current?.animateToRegion(region, 1000);
      }, 700);
    }
  }, [properties, mapReady, focusRegion]);

  useEffect(() => {
    if (Platform.OS !== "web" || !mapInstanceRef.current) return;
    if (focusRegion) {
      const gmaps = (window as any).google?.maps;
      if (!gmaps) return;
      mapInstanceRef.current.setCenter({
        lat: focusRegion.latitude,
        lng: focusRegion.longitude,
      });
      const d = focusRegion.latitudeDelta;
      const zoom =
        d <= 0.02 ? 13 : d <= 0.04 ? 12 : d <= 0.06 ? 11 : d <= 0.1 ? 10 : 9;
      mapInstanceRef.current.setZoom(zoom);
      return;
    }
    if (properties.length === 0) return;

    const bounds = new (window as any).google.maps.LatLngBounds();

    properties.forEach((p) => {
      const lat = p.coordinates?.lat || (p as any).latitud;
      const lng = p.coordinates?.lng || (p as any).longitud;

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        bounds.extend({ lat, lng });
      }
    });

    if (!bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: { top: 150, right: 150, bottom: 150, left: 150 },
      });
    }
  }, [properties]);

  useEffect(() => {
    if (Platform.OS !== "web" || !googleApiKey) return;

    const initMap = () => {
      if (!mapRef.current || !(window as any).google?.maps) return;

      const map = new (window as any).google.maps.Map(mapRef.current, {
        center: { lat: 25.6866, lng: -100.3161 },
        zoom: 11,
        disableDefaultUI: true,
      });

      mapInstanceRef.current = map;
    };

    const existing = document.querySelector(
      "script[data-google-maps]"
    ) as HTMLScriptElement | null;

    if (existing && (window as any).google?.maps) {
      initMap();
      return;
    }

    if (!existing) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMaps = "true";
      script.onload = initMap;
      document.head.appendChild(script);
    }
  }, [googleApiKey]);

  useEffect(() => {
    if (Platform.OS !== "web" || !mapInstanceRef.current) return;

    const gmaps = (window as any).google?.maps;
    if (!gmaps) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    properties.forEach((p) => {
      const lat = p.coordinates?.lat || (p as any).latitud;
      const lng = p.coordinates?.lng || (p as any).longitud;

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      const priceText = formatPrice(p.price || 0);
      const isHighlighted = p.id === highlightedPropertyId;
      const markerColor = isHighlighted ? COLORS.warning : COLORS.primary;

      const svgMarker = `
        <svg xmlns="http://www.w3.org/2000/svg" width="90" height="45" viewBox="0 0 90 45">
          <rect x="8" y="4" width="74" height="30" rx="15" fill="${markerColor}" stroke="white" stroke-width="2.5" />
          <text x="45" y="23" font-family="Arial" font-size="13" fill="white" text-anchor="middle" font-weight="bold">${priceText}</text>
          <path d="M 40 34 L 45 42 L 50 34 Z" fill="${markerColor}" stroke="white" stroke-width="2" />
        </svg>
      `;

      const marker = new gmaps.Marker({
        position: { lat: Number(lat), lng: Number(lng) },
        map: mapInstanceRef.current,
        icon: {
          url:
            "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgMarker),
          scaledSize: new gmaps.Size(90, 45),
          anchor: new gmaps.Point(45, 42),
        },
        optimized: false,
      });

      marker.addListener("click", () => onMarkerPress(p.id, p));
      markersRef.current.push(marker);
    });
  }, [properties, highlightedPropertyId]);

  const initialRegion = useMemo(() => {
    const region = calculateRegionWithPadding();
    return (
      region || {
        latitude: 25.6866,
        longitude: -100.3161,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }
    );
  }, []);

  const makeFocusRegion = (lat: number, lng: number) => {
    const baseDelta = 0.06;
    const latDelta = baseDelta;
    const lngDelta = baseDelta;
    const verticalOffset = latDelta * 0.6;
    return {
      latitude: lat + verticalOffset,
      longitude: lng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  useEffect(() => {
    if (Platform.OS === "web" || !nativeMapRef.current) return;
    if (!highlightedPropertyId) return;
    const target = properties.find((p) => p.id === highlightedPropertyId);
    if (!target) return;
    const lat = target.coordinates?.lat || (target as any).latitud;
    const lng = target.coordinates?.lng || (target as any).longitud;
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
    const region = makeFocusRegion(Number(lat), Number(lng));
    nativeMapRef.current?.animateToRegion(region, 600);
  }, [highlightedPropertyId]);

  if (Platform.OS === "web" && googleApiKey) {
    return (
      <View style={styles.container}>
        <View ref={mapRef as any} style={styles.mapWeb} />
        {properties.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No hay propiedades para mostrar
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={nativeMapRef}
        style={styles.mapNative}
        mapType={"hybrid"}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        onRegionChange={updateOverlayPositions}
        onRegionChangeComplete={updateOverlayPositions}
        mapPadding={{ top: 160, right: 30, bottom: 220 + bottom, left: 30 }}
        moveOnMarkerPress={false}
      >
        {properties.map((p) => {
          const lat = p.coordinates?.lat || (p as any).latitud;
          const lng = p.coordinates?.lng || (p as any).longitud;

          if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={p.id}
              coordinate={{ latitude: Number(lat), longitude: Number(lng) }}
              onPress={() => {
                const region = makeFocusRegion(Number(lat), Number(lng));
                nativeMapRef.current?.animateToRegion(region, 600);
                onMarkerPress(p.id, p);
              }}
              opacity={0} // Marcador invisible pero interactuable
            />
          );
        })}
      </MapView>

      {/* Overlay absoluto para los precios (Inmune a los recortes de Android) */}
      {Platform.OS !== "web" && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {properties.map((p) => {
            const pos = overlayPositions[p.id];
            if (!pos) return null;

            const isHighlighted = p.id === highlightedPropertyId;
            const priceText = formatPrice(p.price || 0);
            const bgColor = isHighlighted ? COLORS.warning : COLORS.primary;

            return (
              <View
                key={`price-${p.id}`}
                style={{
                  position: "absolute",
                  left: Math.max(6, pos.x - 35),
                  top: Math.max(6, pos.y - 35),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    backgroundColor: bgColor,
                    paddingVertical: 5,
                    paddingHorizontal: 8,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: "white",
                    elevation: 5,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 2,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: 11,
                      fontWeight: "bold",
                    }}
                  >
                    {priceText}
                  </Text>
                </View>
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 5,
                    borderRightWidth: 5,
                    borderTopWidth: 7,
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: bgColor,
                    marginTop: -1,
                  }}
                />
              </View>
            );
          })}
        </View>
      )}

      {properties.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No hay propiedades para mostrar</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  markerWrapper: {
    display: "none",
  },
  markerContainer: {
    display: "none",
  },
  markerText: {
    display: "none",
  },
  mapWeb: {
    width: "100%",
    height: "100%",
  },
  mapNative: {
    width: "100%",
    height: "100%",
  },
  emptyState: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -100 }, { translateY: -20 }],
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 3,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: "center",
  },
});
