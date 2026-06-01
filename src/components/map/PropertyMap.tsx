import React, { useRef, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import * as Haptics from "expo-haptics";

import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "../shared/MapComponents";
import { Property } from "@/types";
import { COLORS } from "@/constants/colors";
import { Globe, MapIcon } from "lucide-react-native";
import { PolygonCoord } from "@/store/propertyFiltersStore";
import Supercluster from "supercluster";

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
  drawingMode?: boolean;
  draftPolygonPoints?: PolygonCoord[];
  confirmedPolygons?: PolygonCoord[][];
  onMapPress?: (coord: PolygonCoord) => void;
  onLongPressMap?: (coord: PolygonCoord) => void;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties,
  onMarkerPress,
  googleApiKey,
  highlightedPropertyId,
  focusRegion,
  drawingMode = false,
  draftPolygonPoints = [],
  confirmedPolygons = [],
  onMapPress,
  onLongPressMap,
}) => {
  const mapRef = useRef<any>(null);
  const nativeMapRef = useRef<MapView>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [overlayPositions, setOverlayPositions] = useState<{
    [key: string]: { x: number; y: number };
  }>({});
  const [clusterOverlayPositions, setClusterOverlayPositions] = useState<{
    [key: string]: { x: number; y: number };
  }>({});

  const [mapTypeId, setMapTypeId] = useState<"standard" | "satellite">(
    "standard",
  );

  const [currentRegion, setCurrentRegion] = useState({
    latitude: 25.6866,
    longitude: -100.3161,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  });

  // Fast lookup map for properties
  const propertyMap = useMemo(() => {
    const map = new Map<string, Property>();
    properties.forEach((p) => map.set(p.id, p));
    return map;
  }, [properties]);

  const superclusterRef = useRef<Supercluster | null>(null);

  const superclusterIndex = useMemo(() => {
    const sc = new Supercluster({ radius: 50, maxZoom: 14 });
    const points = properties
      .map((p) => {
        const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
        const lng = p.coordinates?.lng ?? p.longitud ?? undefined;
        if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return null;
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [lng, lat] },
          properties: { propertyId: p.id },
        };
      })
      .filter(Boolean) as any[];
    console.log(`[MapDebug] supercluster: ${points.length} puntos con coords (de ${properties.length} props totales)`);
    sc.load(points);
    superclusterRef.current = sc;
    return sc;
  }, [properties]);

  const latDeltaToZoom = (delta: number) =>
    Math.round(Math.log(360 / delta) / Math.LN2);

  const clusters = useMemo(() => {
    if (Platform.OS === "web") return [];
    const zoom = latDeltaToZoom(currentRegion.latitudeDelta);
    const { latitude, longitude, latitudeDelta, longitudeDelta } = currentRegion;
    const bbox: [number, number, number, number] = [
      longitude - longitudeDelta,
      latitude - latitudeDelta,
      longitude + longitudeDelta,
      latitude + latitudeDelta,
    ];
    const result = superclusterIndex.getClusters(bbox, zoom);
    const isCluster = result.filter((c: any) => c.properties.cluster).length;
    const isPoint = result.filter((c: any) => !c.properties.cluster).length;
    console.log(`[MapDebug] clusters: ${result.length} (${isCluster} agrupados, ${isPoint} individuales) | zoom: ${zoom} | latDelta: ${latitudeDelta.toFixed(3)} | center: ${latitude.toFixed(3)},${longitude.toFixed(3)}`);
    return result;
  }, [superclusterIndex, currentRegion]);

  const individualPropertyIds = useMemo(
    () =>
      new Set(
        clusters
          .filter((c: any) => !c.properties.cluster)
          .map((c: any) => c.properties.propertyId as string),
      ),
    [clusters],
  );

  const handleClusterPress = (clusterId: number) => {
    const leaves = superclusterIndex.getLeaves(clusterId, Infinity);
    const coords = leaves.map((l: any) => ({
      latitude: l.geometry.coordinates[1],
      longitude: l.geometry.coordinates[0],
    }));
    nativeMapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
      animated: true,
    });
  };

  const lastUpdateRef = useRef<number>(0);
  const regionRef = useRef<any>(null);
  const isCalculatingRef = useRef(false);
  const drawingModeRef = useRef(drawingMode);
  useEffect(() => { drawingModeRef.current = drawingMode; }, [drawingMode]);
  const focusRegionRef = useRef(focusRegion);
  useEffect(() => { focusRegionRef.current = focusRegion; }, [focusRegion]);

  // Optimized function to calculate positions only for visible elements
  const updateOverlayPositions = async (region?: any) => {
    if (
      Platform.OS === "web" ||
      !nativeMapRef.current ||
      !mapReady
    )
      return;

    // Use the passed region or the last known one
    const activeRegion = region || regionRef.current;
    if (!activeRegion) return;

    // Throttle: avoid overlapping calculations
    if (isCalculatingRef.current) return;

    const now = Date.now();
    // Only update every ~32ms during motion to keep bridge clear (30fps)
    if (region && now - lastUpdateRef.current < 32) return;

    isCalculatingRef.current = true;
    lastUpdateRef.current = now;

    try {
      // ── Posiciones de precio (propiedades individuales) ──
      const { latitude, longitude, latitudeDelta, longitudeDelta } = activeRegion;
      const latBuffer = latitudeDelta * 0.5;
      const lngBuffer = longitudeDelta * 0.5;
      const minLat = latitude - latitudeDelta - latBuffer;
      const maxLat = latitude + latitudeDelta + latBuffer;
      const minLng = longitude - longitudeDelta - lngBuffer;
      const maxLng = longitude + longitudeDelta + lngBuffer;

      const visibleProps = properties.filter((p) => {
        const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
        const lng = p.coordinates?.lng ?? p.longitud ?? undefined;
        if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return false;
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
      });

      const limitedProps = visibleProps.slice(0, 500);
      const newPositions: any = {};
      const propPromises = limitedProps.map(async (p) => {
        const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
        const lng = p.coordinates?.lng ?? p.longitud ?? undefined;
        try {
          if (!nativeMapRef.current) return;
          const point = await nativeMapRef.current.pointForCoordinate({
            latitude: Number(lat),
            longitude: Number(lng),
          });
          newPositions[p.id] = point;
        } catch (e) { /* ignore */ }
      });
      await Promise.all(propPromises);

      // ── Posiciones de clusters ──
      const currentClusters = superclusterRef.current?.getClusters(
        [minLng, minLat, maxLng, maxLat],
        latDeltaToZoom(latitudeDelta),
      ) ?? [];
      const clusterFeatures = currentClusters.filter((c: any) => c.properties.cluster);
      const newClusterPositions: any = {};
      const clusterPromises = clusterFeatures.map(async (c: any) => {
        const [lng, lat] = c.geometry.coordinates;
        try {
          if (!nativeMapRef.current) return;
          const point = await nativeMapRef.current.pointForCoordinate({
            latitude: lat,
            longitude: lng,
          });
          newClusterPositions[`cluster-${c.id}`] = {
            x: point.x,
            y: point.y,
            count: c.properties.point_count as number,
            clusterId: c.id,
          };
        } catch (e) { /* ignore */ }
      });
      await Promise.all(clusterPromises);

      requestAnimationFrame(() => {
        setOverlayPositions(newPositions);
        setClusterOverlayPositions(newClusterPositions);
      });
    } finally {
      isCalculatingRef.current = false;
    }
  };

  useEffect(() => {
    if (mapReady) {
      updateOverlayPositions();
    }
  }, [properties.length, mapReady, currentRegion]);

  const formatPrice = (
    price: number,
    currency: "USD" | "MXN" = "MXN",
  ): string => {
    const symbol = currency === "USD" ? "USD" : "MXN";
    if (price === 0) return `${symbol} 0`;
    if (price >= 1000000) {
      return `${symbol} ${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `${symbol} ${Math.round(price / 1000)}k`;
    }
    return `${symbol} ${price}`;
  };

  const calculateRegionWithPadding = () => {
    if (properties.length === 0) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    properties.forEach((p) => {
      const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
      const lng = p.coordinates?.lng ?? p.longitud ?? undefined;

      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
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

  // Sincronizar currentRegion con focusRegion inmediatamente (para el bbox de Supercluster)
  useEffect(() => {
    if (focusRegion) {
      setCurrentRegion(focusRegion);
      regionRef.current = focusRegion;
    }
  }, [focusRegion]);

  // Animar la cámara solo cuando cambia focusRegion (navegación explícita)
  useEffect(() => {
    if (Platform.OS === "web" || !nativeMapRef.current || !mapReady) return;
    if (!focusRegion) return;
    nativeMapRef.current?.animateToRegion(focusRegion, 700);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [focusRegion, mapReady]);

  // Auto-fit inicial solo cuando no hay focusRegion (carga sin ubicación seleccionada)
  const hasAutoFitRef = useRef(false);
  useEffect(() => {
    if (Platform.OS === "web" || !nativeMapRef.current || !mapReady) return;
    if (focusRegion) { hasAutoFitRef.current = true; return; }
    if (hasAutoFitRef.current) return;
    if (properties.length === 0) return;
    const region = calculateRegionWithPadding();
    if (region) {
      hasAutoFitRef.current = true;
      setCurrentRegion(region);
      setTimeout(() => {
        if (focusRegionRef.current) return;
        nativeMapRef.current?.animateToRegion(region, 1000);
      }, 700);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, mapReady]);

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
      const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
      const lng = p.coordinates?.lng ?? p.longitud ?? undefined;

      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
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
      "script[data-google-maps]",
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
      const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
      const lng = p.coordinates?.lng ?? p.longitud ?? undefined;

      if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return;

      const priceText = formatPrice(p.price || 0, p.currency);
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
    const lat = target.coordinates?.lat ?? target.latitud ?? undefined;
    const lng = target.coordinates?.lng ?? target.longitud ?? undefined;
    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return;
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
      <Pressable
        style={styles.mapTypeButton}
        onPress={() =>
          setMapTypeId(mapTypeId === "standard" ? "satellite" : "standard")
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
        style={styles.mapNative}
        mapType={mapTypeId}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        initialRegion={initialRegion}
        onMapReady={() => setMapReady(true)}
        onRegionChange={(region) => {
          regionRef.current = region;
          updateOverlayPositions(region);
        }}
        onRegionChangeComplete={(region) => {
          regionRef.current = region;
          setCurrentRegion(region);
          updateOverlayPositions(region);
          console.log(`[MapDebug] onRegionChangeComplete: latDelta=${region.latitudeDelta.toFixed(3)} center=${region.latitude.toFixed(3)},${region.longitude.toFixed(3)}`);
        }}
        onPress={undefined}
        onLongPress={(e) => {
          const coord = e.nativeEvent.coordinate;
          if (drawingMode && onMapPress) {
            onMapPress(coord);
          } else if (!drawingMode && onLongPressMap) {
            onLongPressMap(coord);
          }
        }}
        scrollEnabled={true}
        zoomEnabled={true}

        moveOnMarkerPress={false}
      >
        {/* Polígonos confirmados (múltiples) */}
        {confirmedPolygons.map((polygon, i) =>
          polygon.length >= 3 ? (
            <Polygon
              key={`confirmed-polygon-${i}`}
              coordinates={polygon}
              fillColor="rgba(69,160,165,0.18)"
              strokeColor={COLORS.primary}
              strokeWidth={2}
            />
          ) : null,
        )}

        {/* Polígono en borrador */}
        {draftPolygonPoints.length >= 2 && (
          <Polyline
            coordinates={draftPolygonPoints}
            strokeColor={COLORS.primary}
            strokeWidth={2.5}
            lineDashPattern={[8, 4]}
          />
        )}
        {draftPolygonPoints.length >= 3 && (
          <Polygon
            coordinates={draftPolygonPoints}
            fillColor="rgba(69,160,165,0.12)"
            strokeColor="transparent"
            strokeWidth={0}
          />
        )}

        {/* Vértices del borrador */}
        {draftPolygonPoints.map((pt, idx) => (
          <Marker
            key={`vertex-${idx}`}
            coordinate={pt}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={vertexStyles.dot}>
              <View style={vertexStyles.dotInner} />
            </View>
          </Marker>
        ))}
        {/* Invisible cluster touch targets */}
        {clusters
          .filter((c: any) => c.properties.cluster)
          .map((cluster: any) => {
            const [lng, lat] = cluster.geometry.coordinates;
            return (
              <Marker
                key={`cluster-touch-${cluster.id}`}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => handleClusterPress(cluster.id)}
                tracksViewChanges={false}
                anchor={{ x: 0.5, y: 0.5 }}
                opacity={0}
              />
            );
          })}

        {/* Markers individuales — invisibles (detectan toque), solo para props no agrupadas */}
        {clusters
          .filter((c: any) => !c.properties.cluster)
          .map((point: any) => {
            const propertyId = point.properties.propertyId as string;
            const p = propertyMap.get(propertyId);
            if (!p) return null;
            const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
            const lng = p.coordinates?.lng ?? p.longitud ?? undefined;
            if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return null;
            return (
              <Marker
                key={p.id}
                coordinate={{ latitude: Number(lat), longitude: Number(lng) }}
                onPress={() => {
                  const r = makeFocusRegion(Number(lat), Number(lng));
                  nativeMapRef.current?.animateToRegion(r, 600);
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  onMarkerPress(p.id, p);
                }}
                opacity={0}
                tracksViewChanges={false}
              />
            );
          })}
      </MapView>

      {/* Overlay absoluto para los precios (Inmune a los recortes de Android) */}
      {Platform.OS !== "web" && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Object.entries(overlayPositions).map(([id, pos]) => {
            const p = propertyMap.get(id);
            if (!p) return null;
            if (!individualPropertyIds.has(id)) return null;

            const isHighlighted = p.id === highlightedPropertyId;
            const priceText = formatPrice(p.price || 0, p.currency);
            const bgColor = isHighlighted ? COLORS.warning : COLORS.primary;

            return (
              <View
                key={`price-${p.id}`}
                style={{
                  position: "absolute",
                  left: Math.max(6, (pos as any).x - 35),
                  top: Math.max(6, (pos as any).y - 35),
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

      {/* Cluster bubbles overlay — rendered outside MapView para garantizar visibilidad en Android */}
      {Platform.OS !== "web" && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Object.entries(clusterOverlayPositions).map(([key, data]: [string, any]) => {
            const count = data.count as number;
            const size = count < 10 ? 44 : count < 50 ? 56 : 68;
            const bg =
              count < 10 ? COLORS.primary : count < 50 ? "#E07B00" : COLORS.error;
            return (
              <View
                key={key}
                style={{
                  position: "absolute",
                  left: data.x - size / 2,
                  top: data.y - size / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: bg + "30",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: size * 0.7,
                    height: size * 0.7,
                    borderRadius: (size * 0.7) / 2,
                    backgroundColor: bg,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "white",
                  }}
                >
                  <Text style={styles.clusterCount}>
                    {count > 999 ? "999+" : count}
                  </Text>
                </View>
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
  clusterOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  clusterInner: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  clusterCount: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
  },
});

const vertexStyles = StyleSheet.create({
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
});
