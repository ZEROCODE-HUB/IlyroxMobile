import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
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
import { Globe, MapIcon, Layers, Mountain, ChevronDown } from "lucide-react-native";
import { PolygonCoord } from "@/store/propertyFiltersStore";
import Supercluster from "supercluster";
import { logger } from "@/utils/logger";

const log = logger.scoped("PropertyMap");

/** Estable: cada nueva referencia reescribe la prop nativa de la Polyline. */
const DRAFT_DASH_PATTERN = [8, 4];

/** Estilo del contador dentro de ClusterBubble. Se declara aquí (módulo) en
 *  vez de leerse desde `styles` (que vive al final del archivo) para evitar
 *  la referencia adelantada con `const`/`StyleSheet.create` y mantener
 *  legible el orden top-down. */
const clusterCountStyle = { color: "white", fontSize: 13, fontWeight: "bold" as const };

/**
 * Validación defensiva de coordenadas para evitar el crash iOS
 * `RCTLegacyViewManagerInteropComponentView finalizeUpdates → insertObject:atIndex: nil`.
 *
 * ¿Por qué? `react-native-maps@1.20.1` con New Architecture / Fabric en iOS
 * tiene un bug conocido (#5521 / #5217) en el legacy interop: cuando un child
 * del `<MapView>` llega con `coordinate` inválida (null, NaN, fuera de rango)
 * o cuando un re-render rápido desmonta un marker antes de que el interop lo
 * procese, `[_reactSubviews insertObject:subview atIndex:]` recibe `nil` y
 * lanza `*** -[__NSArrayM insertObject:atIndex:]: object cannot be nil` → SIGABRT.
 *
 * La fix oficial del repo (#5871, #5940) está en 1.29.3/1.29.4, pero mientras
 * actualizamos, esta validación JS evita que children con coords inválidas
 * lleguen al interop. Si una propiedad tiene coords corruptas (null, NaN,
 * > 90° lat o > 180° lng), simplemente no se renderiza su marker.
 */
function isValidCoord(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/**
 * Valida un array de coordenadas (un polígono). Retorna `true` solo si tiene
 * al menos 3 vértices y todos tienen coords válidas. Usar para polígonos
 * confirmados por la búsqueda guardada o para el polígono en borrador.
 */
function isValidPolygon(polygon: unknown): polygon is Array<{ latitude: number; longitude: number }> {
  return (
    Array.isArray(polygon) &&
    polygon.length >= 3 &&
    polygon.every((p) => isValidCoord((p as any)?.latitude, (p as any)?.longitude))
  );
}

/**
 * Proyección inversa Mercator: convierte (lat, lng) → coordenadas de pantalla
 * (x, y) en píxeles del MapView, usando la MISMA fórmula de proyección
 * Mercator que usan Apple Maps y Google Maps internamente.
 *
 * ¿Por qué no basta con una fórmula lineal?
 * La fórmula naive `x = (lng - lng0) / deltaLng * width` funciona para
 * longitud (Mercator es lineal en X), pero NO funciona para latitud:
 * Mercator comprime las latitudes altas (cerca de los polos) y estira las
 * bajas (cerca del ecuador). Una fórmula lineal da desfases de varios
 * píxeles en latitudes medias-altas, que es exactamente el bug que se veía
 * (los badges se quedaban "rezagados" al arrastrar el mapa).
 *
 * La fórmula correcta proyecta lat a un espacio logarítmico:
 *   y_mercator(lat) = ln(tan(π/4 + lat_rad/2))
 * y luego interpola linealmente entre el top y el bottom del mapa.
 *
 * IMPORTANTE: el resultado es relativo al wrapper de RN del MapView, no al
 * MKMapView nativo. En iOS estos pueden diferir (safe area, elementos UI).
 * Por eso el resultado se suma a un offset calibrado con `pointForCoordinate`.
 *
 * Si `mapSize` aún no está disponible (antes del primer onLayout), devuelve
 * null y el caller cae al fallback de `pointForCoordinate`.
 */
function latLngToScreen(
  lat: number,
  lng: number,
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
  mapSize: { width: number; height: number } | null,
  offset: { dx: number; dy: number } = { dx: 0, dy: 0 },
): { x: number; y: number } | null {
  if (!mapSize || mapSize.width <= 0 || mapSize.height <= 0) return null;
  if (region.longitudeDelta === 0 || region.latitudeDelta === 0) return null;

  // Longitud: lineal en X (Mercator es equidistante en longitud).
  const x = ((lng - (region.longitude - region.longitudeDelta / 2)) / region.longitudeDelta) * mapSize.width;

  // Latitud: proyección Mercator.
  const project = (latDeg: number) => {
    const latRad = (latDeg * Math.PI) / 180;
    return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  };

  const topLat = region.latitude + region.latitudeDelta / 2;
  const bottomLat = region.latitude - region.latitudeDelta / 2;
  const topY = project(topLat);
  const bottomY = project(bottomLat);
  const pointY = project(lat);

  const yRange = topY - bottomY;
  if (yRange === 0 || !Number.isFinite(yRange)) return null;
  const y = ((topY - pointY) / yRange) * mapSize.height;

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x: x + offset.dx, y: y + offset.dy };
}

// ── Componentes de overlay memoizados a NIVEL DE MÓDULO ───────────────────────
// IMPORTANTE: nunca definir componentes dentro de otro componente/render. Si se
// hace, React los ve como un tipo nuevo en cada render → desmonta y remonta el
// árbol completo de Views cada vez, lo cual inunda el commit de Fabric con
// mounts/unmounts innecesarios. En iOS con react-native-maps (legacy interop)
// este patrón ha causado crashes en el `RCTLegacyViewManagerInteropComponentView`
// durante transacciones grandes. Es el mismo anti-patrón que ya corregimos con
// `MemoizedPropertyMap` a nivel de módulo en `MapSearch.tsx`.
interface PriceBadgeProps {
  x: number;
  y: number;
  priceText: string;
  bgColor: string;
  stackCount: number;
}
const PriceBadge = React.memo(({ x, y, priceText, bgColor, stackCount }: PriceBadgeProps) => (
  <View
    style={{
      position: "absolute",
      left: Math.max(6, x - 35),
      top: Math.max(6, y - 35),
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
      <Text style={{ color: "white", fontSize: 11, fontWeight: "bold" }}>
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
    {stackCount > 1 && (
      <View
        style={{
          position: "absolute",
          top: -8,
          right: -10,
          minWidth: 20,
          height: 20,
          paddingHorizontal: 4,
          borderRadius: 10,
          backgroundColor: COLORS.error,
          borderWidth: 1.5,
          borderColor: "white",
          alignItems: "center",
          justifyContent: "center",
          elevation: 6,
        }}
      >
        <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>
          {stackCount > 99 ? "99+" : stackCount}
        </Text>
      </View>
    )}
  </View>
));
PriceBadge.displayName = "PriceBadge";

interface ClusterBubbleProps {
  x: number;
  y: number;
  count: number;
}
const ClusterBubble = React.memo(({ x, y, count }: ClusterBubbleProps) => {
  const size = count < 10 ? 44 : count < 50 ? 56 : 68;
  const bg = count < 10 ? COLORS.primary : count < 50 ? "#E07B00" : COLORS.error;
  return (
    <View
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
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
        <Text style={clusterCountStyle}>
          {count > 999 ? "999+" : count}
        </Text>
      </View>
    </View>
  );
});
ClusterBubble.displayName = "ClusterBubble";

interface PropertyMapProps {
  properties: Property[];
  onMarkerPress: (propertyId: string, property: Property) => void;
  /** Se dispara cuando un pin/clúster representa VARIAS propiedades en la misma
      coordenada (que el zoom no puede separar). Recibe todos sus ids para que
      la pantalla ofrezca un selector; sin esto solo se abriría una de ellas. */
  onStackPress?: (propertyIds: string[]) => void;
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
  /** Cierra el polígono al tocar su primer vértice. */
  onCloseDraftPolygon?: () => void;
  /** Pins clásicos en el punto exacto de cada ubicación buscada/agregada. */
  searchedLocationPins?: { key: string; latitude: number; longitude: number }[];
  /** Altura de una barra superior que tape el mapa (p. ej. SearchFiltersBar),
      para bajar el selector de tipo de mapa y que no quede oculto. */
  topOffset?: number;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties: rawProperties,
  onMarkerPress,
  onStackPress,
  googleApiKey,
  highlightedPropertyId,
  focusRegion,
  drawingMode = false,
  draftPolygonPoints = [],
  confirmedPolygons = [],
  onMapPress,
  onLongPressMap,
  onCloseDraftPolygon,
  searchedLocationPins,
  topOffset = 0,
}) => {
  // Solo entran al mapa las propiedades con coordenadas válidas. Antes cada
  // cálculo (supercluster, auto-fit, overlays…) validaba por su cuenta y solo
  // con `isNaN`: una lat/lng fuera de rango (p. ej. invertidas) pasaba y
  // producía una región imposible que MapKit rechaza con una excepción nativa
  // ("Invalid Region") que ningún try/catch de JS atrapa.
  const properties = useMemo(
    () =>
      rawProperties.filter((p) =>
        isValidCoord(p.coordinates?.lat ?? p.latitud, p.coordinates?.lng ?? p.longitud),
      ),
    [rawProperties],
  );

  const mapRef = useRef<any>(null);
  const nativeMapRef = useRef<MapView>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  // Tamaño del wrapper de RN del MapView. Se usa como base para el cálculo
  // matemático de posiciones de badges/burbujas/vértices. Sin embargo, el
  // wrapper de RN puede tener un tamaño DIFERENTE al MKMapView nativo en
  // iOS (por safe area, paddingAdjustmentBehavior, elementos UI como
  // brújula/escala que se renderizan dentro del MKMapView pero NO afectan
  // su área de coordenadas). Por eso `mapOffset` captura la diferencia entre
  // la posición que calcula mi fórmula y la posición real del MKMapView
  // (obtenida con `pointForCoordinate`), y se aplica a todos los cálculos
  // subsiguientes. Esto da posiciones exactas con cálculo instantáneo.
  const [mapSize, setMapSize] = useState<{ width: number; height: number } | null>(null);
  const mapSizeRef = useRef<{ width: number; height: number } | null>(null);
  mapSizeRef.current = mapSize;
  // Offset en píxeles entre el wrapper de RN y el MKMapView nativo. Se
  // calibra con `pointForCoordinate` y se re-calibra si cambia. Aplicar este
  // offset a las posiciones calculadas con `latLngToScreen` es lo que hace
  // que los badges/burbujas/vértice caigan EXACTAMENTE sobre los markers
  // nativos del mapa, sin desfase durante el drag.
  const mapOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // ── Mitigación del crash de Fabric (RCTLegacyViewManagerInteropComponentView) ──
  //
  // El bug: en `react-native-maps@1.20.1` con New Architecture (Fabric) en iOS,
  // cuando los children del `<MapView>` se montan/desmontan en varios commits
  // seguidos (mount→unmount→mount), el interop legacy entrega `subview = nil`
  // en `-[AIRMap insertReactSubview:atIndex:]` y crashea con
  // "*** -[__NSArrayM insertObject:atIndex:]: object cannot be nil"
  // (ver react-native-maps#5217 / PR #5871).
  //
  // ANTES: teníamos un "drenado" que ponía `markersDraining = true` durante
  // ~32 ms cuando había un cambio masivo de propiedades, devolviendo `[]` en
  // los `useMemo` de markers. La idea era separar el commit de remoción del
  // commit de inserción. PERO los logs de TestFlight mostraron que ese drenado
  // generaba exactamente el patrón mount→unmount→mount que rompe el interop,
  // sobre todo cuando se combinaba con la transición de `pins` (searched
  // location pins) al mismo tiempo. En el caso "Ruscello" el crash era
  // reproducible 100% con el drenado activo.
  //
  // AHORA:
  //   1) Sin drenado. Los markers se renderizan siempre (módulo inicial y al
  //      cambiar filtros). React reconcilia naturalmente.
  //   2) Los markers se difieren hasta que `mapReady === true` (el primer
  //      `onMapReady` del MapView nativo). Eso separa el commit de mount del
  //      MapView del commit de mount de sus children, evitando la condición de
  //      carrera del interop. Una vez `mapReady`, los markers se mantienen
  //      montados durante toda la vida del componente.
  //   3) Se mantienen `isValidCoord` / `isValidPolygon` como red de seguridad
  //      para no enviar coordenadas corruptas al lado nativo.
  //
  // Si tras este cambio el crash reaparece, el siguiente paso es actualizar
  // `react-native-maps` a `^1.29.11` (incluye el nil-check nativo de PR #5871).

  // ── Cleanup refs ──
  const mountedRef = useRef(true);
  const autoFitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftPolygonPointsRef = useRef<PolygonCoord[]>(draftPolygonPoints);
  draftPolygonPointsRef.current = draftPolygonPoints;
  const individualPropertyIdsRef = useRef<Set<string>>(new Set());

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (autoFitTimerRef.current) clearTimeout(autoFitTimerRef.current);
    };
  }, []);

  // Cierre del polígono tocando el primer vértice (crítico en iOS): el onPress
  // se conecta desde que el vértice se crea (longitud 1) y se mantiene ESTABLE,
  // para que Apple Maps registre el manejador de toque antes de que el marcador
  // se congele (tracksViewChanges=false). Si se añadiera al llegar a 3 puntos,
  // el marcador ya estaría congelado y no tomaría el nuevo handler. El handler
  // no hace nada hasta que hay 3+ puntos; la longitud se lee por ref para no
  // cambiar la identidad del callback (que recrearía el marcador).
  const draftLenRef = useRef(draftPolygonPoints.length);
  draftLenRef.current = draftPolygonPoints.length;
  const onCloseRef = useRef(onCloseDraftPolygon);
  onCloseRef.current = onCloseDraftPolygon;
  const handleFirstVertexPress = useCallback(() => {
    if (draftLenRef.current >= 3) onCloseRef.current?.();
  }, []);
  const [overlayPositions, setOverlayPositions] = useState<{
    [key: string]: { x: number; y: number };
  }>({});
  const [clusterOverlayPositions, setClusterOverlayPositions] = useState<{
    [key: string]: { x: number; y: number };
  }>({});
  // Posición en pantalla del primer vértice del borrador (píxeles). Se usa para
  // dibujar un botón de cierre de RN encima; ver nota en el JSX del overlay.
  const [firstVertexScreenPos, setFirstVertexScreenPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // "hybrid" por defecto (satélite + etiquetas de calles/colonias): en
  // "satellite" puro no había nombres y era difícil orientarse en el mapa.
  const [mapTypeId, setMapTypeId] = useState<
    "standard" | "satellite" | "hybrid" | "terrain"
  >("hybrid");
  const [mapTypeMenuOpen, setMapTypeMenuOpen] = useState(false);

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

  // Clave de coincidencia por coordenada (~1 m con 5 decimales). Varias
  // propiedades pueden compartir exactamente la misma coordenada (p. ej.
  // EasyBroker asigna a menudo el centro de la colonia, no la casa concreta):
  // sus marcadores quedan encimados y, sin agrupar, solo se abriría una.
  const coincidenceKey = (lat: number, lng: number) =>
    `${lat.toFixed(5)},${lng.toFixed(5)}`;

  const coincidentGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    properties.forEach((p) => {
      const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
      const lng = p.coordinates?.lng ?? p.longitud ?? undefined;
      if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return;
      const key = coincidenceKey(lat, lng);
      const arr = groups.get(key);
      if (arr) arr.push(p.id);
      else groups.set(key, [p.id]);
    });
    return groups;
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
    log.debug(`supercluster: ${points.length} puntos con coords (de ${properties.length} props totales)`);
    sc.load(points);
    superclusterRef.current = sc;
    return sc;
  }, [properties]);

  const latDeltaToZoom = (delta: number) =>
    Math.round(Math.log(360 / delta) / Math.LN2);

  const clusters = useMemo(() => {
    if (Platform.OS === "web") return [];
    // Guard: si currentRegion es null o tiene NaN, retornar array vacío
    // para evitar crash en supercluster.getClusters (que no valida internamente).
    if (
      !currentRegion ||
      !Number.isFinite(currentRegion.latitude) ||
      !Number.isFinite(currentRegion.longitude) ||
      !Number.isFinite(currentRegion.latitudeDelta) ||
      !Number.isFinite(currentRegion.longitudeDelta) ||
      currentRegion.latitudeDelta <= 0 ||
      currentRegion.longitudeDelta <= 0
    ) {
      return [];
    }
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
    log.debug(`clusters: ${result.length} (${isCluster} agrupados, ${isPoint} individuales) | zoom: ${zoom} | latDelta: ${latitudeDelta.toFixed(3)} | center: ${latitude.toFixed(3)},${longitude.toFixed(3)}`);
    // LOG TEMPORAL — detalle de cada clúster/punto cuando son pocos.
    if (__DEV__ && result.length > 0 && result.length <= 20) {
      log.warn(
        `[MapCluster] detalle (${result.length}):`,
        JSON.stringify(
          result.map((c: any) => ({
            id: c.id ?? c.properties.cluster_id,
            esCluster: Boolean(c.properties.cluster),
            count: c.properties.point_count ?? 1,
            lng: c.geometry?.coordinates?.[0],
            lat: c.geometry?.coordinates?.[1],
          })),
          null,
          2,
        ),
      );
    }
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

  // Mantener ref sincronizado para que updateOverlayPositions acceda sin deps
  useEffect(() => {
    individualPropertyIdsRef.current = individualPropertyIds;
  }, [individualPropertyIds]);

  const handleClusterPress = (clusterId: number) => {
    const leaves = superclusterIndex.getLeaves(clusterId, Infinity);
    // Con una lista vacía, MapKit calcula un MKMapRect nulo y aborta.
    if (leaves.length === 0) return;
    const coords = leaves.map((l: any) => ({
      latitude: l.geometry.coordinates[1],
      longitude: l.geometry.coordinates[0],
    }));
    // Si TODAS las hojas están (casi) en el mismo punto, el zoom nunca separará
    // el clúster: ofrecemos un selector con todas las propiedades en su lugar.
    const first = coords[0];
    const allSamePoint = coords.every(
      (c) =>
        Math.abs(c.latitude - first.latitude) < 1e-5 &&
        Math.abs(c.longitude - first.longitude) < 1e-5,
    );
    if (allSamePoint && onStackPress) {
      onStackPress(leaves.map((l: any) => l.properties.propertyId as string));
      return;
    }
    try {
      nativeMapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    } catch (e) {
      // `fitToCoordinates` puede lanzar si el mapa se está desmontando o si
      // las coords son inválidas. Silenciar para no crashear.
      if (__DEV__) log.warn("fitToCoordinates falló:", (e as Error)?.message);
    }
  };

  // Handler estable para los markers individuales (invisibles). Se usa en
  // lugar de un `onPress={() => {...}}` inline dentro del `.map` del
  // useMemo, para que la referencia del handler sea estable entre renders.
  // Esto evita que el interop de react-native-maps vea un cambio de prop en
  // cada render y re-serialize el marker (lo cual puede contribuir a
  // `insertObject:atIndex: nil` durante commits grandes de Fabric).
  const handleIndividualMarkerPressRef = useRef<
    (propertyId: string, lat: number, lng: number, property: Property) => void
  >(() => {});
  handleIndividualMarkerPressRef.current = (propertyId, lat, lng, property) => {
    const group = coincidentGroups.get(coincidenceKey(lat, lng));
    if (group && group.length > 1 && onStackPress) {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      onStackPress(group);
      return;
    }
    const r = makeFocusRegion(lat, lng);
    try {
      nativeMapRef.current?.animateToRegion(r, 600);
    } catch (e) {
      if (__DEV__) log.warn("animateToRegion (individual marker) falló:", (e as Error)?.message);
    }
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onMarkerPress(propertyId, property);
  };
  const handleIndividualMarkerPress = useCallback(
    (propertyId: string, lat: number, lng: number, property: Property) =>
      handleIndividualMarkerPressRef.current(propertyId, lat, lng, property),
    [],
  );

  const lastUpdateRef = useRef<number>(0);
  const regionRef = useRef<any>(null);
  const drawingModeRef = useRef(drawingMode);
  useEffect(() => { drawingModeRef.current = drawingMode; }, [drawingMode]);
  const focusRegionRef = useRef(focusRegion);
  useEffect(() => { focusRegionRef.current = focusRegion; }, [focusRegion]);

  // Refs para evitar closures obsoletos en useCallback([]).
  // Si leemos `mapReady` y `properties` directamente del closure, el callback
  // queda congelado al primer render y deja de funcionar cuando el estado
  // cambia (era el bug que rompía badges/burbujas/cierre-de-polígono en
  // iteración 9).
  const mapReadyRef = useRef(mapReady);
  useEffect(() => { mapReadyRef.current = mapReady; }, [mapReady]);
  const propertiesRef = useRef(properties);
  useEffect(() => { propertiesRef.current = properties; }, [properties]);
  // Re-calibrar offset cuando el tamaño del wrapper cambia. NO se hace dentro
  // del setMapSize updater (sería un side-effect durante render, anti-patrón
  // que puede causar crashes con React 18 / Fabric).
  useEffect(() => {
    if (mapSize && mapReady) {
      calibrateOffset(true).catch(() => {});
    }
    // calibrateOffset es estable (useCallback con deps en updateOverlayPositions,
    // que es estable). No lo pongo en deps para no crear un loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSize, mapReady]);

  // Optimized function to calculate positions only for visible elements.
  // Implementación SÍNCRONA con matemática pura (latLngToScreen) + offset
  // calibrado con `pointForCoordinate`. Esto da posiciones EXACTAS (no
  // desfasadas) sin pasar por el bridge en cada frame. Antes era async con
  // `pointForCoordinate` (round-trip al bridge) → delay 80-150ms. Antes
  // también intentamos matemática pura sin calibrar, pero en iOS el
  // wrapper de RN puede tener un tamaño distinto al MKMapView nativo
  // (safe area, elementos UI), causando que los badges se quedaran
  // desfasados del marker nativo. La calibración con pointForCoordinate
  // captura esa diferencia y la corrige.
  const updateOverlayPositions = useCallback((region?: any) => {
    if (Platform.OS === "web" || !nativeMapRef.current || !mapReadyRef.current) return;
    if (!mountedRef.current) return;

    const activeRegion = region || regionRef.current;
    if (!activeRegion) return;

    const now = Date.now();
    // Sin throttle: la fórmula + offset es O(n) y muy rápida. Llamar setState
    // en cada onRegionChange a 60fps triggerea un re-render, pero React
    // reconcilia badges/burbujas con keys estables y solo cambia sus
    // posiciones (left/top) → mount/unmount cero, solo updates de estilo.
    if (region && now - lastUpdateRef.current < 16) return; // máx 1 llamada por frame
    lastUpdateRef.current = now;

    const { latitude, longitude, latitudeDelta, longitudeDelta } = activeRegion;
    const latBuffer = latitudeDelta * 0.5;
    const lngBuffer = longitudeDelta * 0.5;
    const minLat = latitude - latitudeDelta - latBuffer;
    const maxLat = latitude + latitudeDelta + latBuffer;
    const minLng = longitude - longitudeDelta - lngBuffer;
    const maxLng = longitude + longitudeDelta + lngBuffer;

    const size = mapSizeRef.current;
    const offset = mapOffsetRef.current;
    const currentProperties = propertiesRef.current;
    const visibleNonClustered = currentProperties
      .filter((p) => {
        const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
        const lng = p.coordinates?.lng ?? p.longitud ?? undefined;
        if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return false;
        if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) return false;
        return individualPropertyIdsRef.current.has(p.id);
      })
      .slice(0, 150);

    const newPositions: any = {};
    visibleNonClustered.forEach((p) => {
      const lat = p.coordinates?.lat ?? p.latitud;
      const lng = p.coordinates?.lng ?? p.longitud;
      if (lat == null || lng == null) return;
      const screen = latLngToScreen(Number(lat), Number(lng), activeRegion, size, offset);
      if (screen) newPositions[p.id] = screen;
    });

    // Clusters
    const currentClusters = superclusterRef.current?.getClusters(
      [minLng, minLat, maxLng, maxLat],
      latDeltaToZoom(latitudeDelta),
    ) ?? [];
    const clusterFeatures = currentClusters.filter((c: any) => c.properties.cluster);
    const newClusterPositions: any = {};
    clusterFeatures.forEach((c: any) => {
      const [lng, lat] = c.geometry.coordinates;
      const screen = latLngToScreen(lat, lng, activeRegion, size, offset);
      if (screen) {
        newClusterPositions[`cluster-${c.id}`] = {
          x: screen.x,
          y: screen.y,
          count: c.properties.point_count as number,
          clusterId: c.id,
        };
      }
    });

    // Primer vértice del polígono (botón de cierre)
    let firstVertexPos: { x: number; y: number } | null = null;
    if (
      drawingModeRef.current &&
      draftPolygonPointsRef.current.length >= 3
    ) {
      const first = draftPolygonPointsRef.current[0];
      const screen = latLngToScreen(first.latitude, first.longitude, activeRegion, size, offset);
      if (screen) firstVertexPos = screen;
    }

    if (mountedRef.current) {
      setOverlayPositions(newPositions);
      setClusterOverlayPositions(newClusterPositions);
      setFirstVertexScreenPos(firstVertexPos);
    }
  }, []); // sin deps — usa solo refs (mapSizeRef, mapOffsetRef, mapReadyRef, propertiesRef)

  // Calibra el offset entre el wrapper de RN y el MKMapView nativo usando
  // `pointForCoordinate` del nativo. Esto captura cualquier diferencia entre
  // el wrapper de RN (que es lo que mide `onLayout`) y el MKMapView nativo
  // (que es donde se renderizan los markers). En iOS, el wrapper puede
  // tener un tamaño distinto por safe area, paddingAdjustmentBehavior, o
  // elementos UI nativos (brújula, escala, logo de Apple) que se renderizan
  // DENTRO del MKMapView pero no afectan su área visible. Sin esta
  // calibración, los badges/burbujas se calculan respecto al wrapper pero
  // los markers nativos están en el MKMapView → hay un offset visible.
  const calibrationCounterRef = useRef(0);
  const calibrateOffset = useCallback(async (force = false) => {
    if (Platform.OS === "web" || !nativeMapRef.current || !mapReadyRef.current) return;
    if (!mountedRef.current) return;
    calibrationCounterRef.current += 1;
    if (!force && calibrationCounterRef.current % 5 !== 0) return;

    const size = mapSizeRef.current;
    const region = regionRef.current;
    if (!size || !region) return;

    // Usamos el centro del mapa como punto de calibración.
    const centerLat = region.latitude;
    const centerLng = region.longitude;
    // try/catch defensivo: `pointForCoordinate` puede lanzar si el mapa
    // nativo se está desmontando, o si el centro es NaN (en cuyo caso
    // MKMapView lanza NSInvalidArgumentException → promesa rechazada).
    // Sin este catch, un rechazo se propagaría como unhandled promise
    // rejection, que en builds de iOS puede aparecer como crash.
    let nativePoint: { x: number; y: number } | null = null;
    try {
      nativePoint = await nativeMapRef.current.pointForCoordinate({
        latitude: centerLat,
        longitude: centerLng,
      });
    } catch (e) {
      // Silenciar: la próxima calibración lo intentará de nuevo. Logueamos
      // solo en dev para no spamear producción.
      if (__DEV__) log.debug("[mapOffset] pointForCoordinate falló:", (e as Error)?.message);
      return;
    }
    if (!mountedRef.current || !nativePoint) return;
    if (
      !Number.isFinite(nativePoint.x) ||
      !Number.isFinite(nativePoint.y)
    ) {
      // El nativo devolvió NaN/Infinity (no debería, pero por seguridad).
      return;
    }
    const mathPoint = latLngToScreen(centerLat, centerLng, region, size, { dx: 0, dy: 0 });
    if (!mathPoint) return;
    const newOffset = {
      dx: nativePoint.x - mathPoint.x,
      dy: nativePoint.y - mathPoint.y,
    };
    // Solo actualizar si el offset cambió significativamente (más de 0.5px)
    // para evitar jitter innecesario.
    if (
      Math.abs(newOffset.dx - mapOffsetRef.current.dx) > 0.5 ||
      Math.abs(newOffset.dy - mapOffsetRef.current.dy) > 0.5
    ) {
      log.debug(
        `[mapOffset] recalibrado: dx=${newOffset.dx.toFixed(1)} dy=${newOffset.dy.toFixed(1)} (antes: dx=${mapOffsetRef.current.dx.toFixed(1)} dy=${mapOffsetRef.current.dy.toFixed(1)})`,
      );
      mapOffsetRef.current = newOffset;
      // Re-aplicar inmediatamente el offset a las posiciones actuales para
      // que el usuario no vea un frame con el offset anterior antes de la
      // próxima actualización.
      updateOverlayPositions();
    }
  }, [updateOverlayPositions]);

  useEffect(() => {
    if (mapReady) {
      updateOverlayPositions();
    }
  }, [properties.length, mapReady, currentRegion]);

  // Recalcular la posición del primer vértice al añadir/quitar puntos o al
  // entrar/salir del modo dibujo (esas acciones no disparan onRegionChange).
  useEffect(() => {
    if (mapReady) updateOverlayPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftPolygonPoints.length, drawingMode, mapReady]);

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

    // Multiplicar por 3 para dar MUCHO espacio a los marcadores, sin pasar
    // del máximo que acepta MapKit (180° / 360°): con propiedades muy
    // dispersas el ×3 lo superaba y la región era inválida.
    latDelta = Math.min(latDelta * 3, 180);
    lngDelta = Math.min(lngDelta * 3, 360);

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  // Sincronizar regionRef inmediatamente (para que `updateOverlayPositions` ya
  // pueda calcular posiciones de overlay durante la animación de cámara), pero
  // NO llamar `setCurrentRegion` aquí. Si lo hacemos, `clusters` se recalcula
  // síncronamente y React re-keyea todos los `<Marker>` en la MISMA transacción
  // de Fabric que dispara el `animateToRegion` y el mount inicial — eso fue el
  // crash: `RCTLegacyViewManagerInteropComponentView finalizeUpdates` recibía
  // un child `nil` durante un commit masivo. Dejamos que `onRegionChangeComplete`
  // (más abajo) actualice `currentRegion` cuando la cámara llegue; así, el
  // re-cluster/re-key ocurre en una transacción separada, pequeña, y al final
  // de los 700 ms de animación.
  useEffect(() => {
    if (focusRegion) {
      regionRef.current = focusRegion;
    }
  }, [focusRegion]);

  // Animar la cámara solo cuando cambia focusRegion (navegación explícita)
  useEffect(() => {
    if (Platform.OS === "web" || !nativeMapRef.current || !mapReady) return;
    if (!focusRegion) return;
    // Validación defensiva: si por alguna razón la región tiene NaN/Infinity
    // (p. ej. bounds malformados de geocoding), abortamos en vez de enviarlo a
    // MapKit (que lanza `NSInvalidArgumentException` con valores inválidos).
    if (
      !Number.isFinite(focusRegion.latitude) ||
      !Number.isFinite(focusRegion.longitude) ||
      !Number.isFinite(focusRegion.latitudeDelta) ||
      !Number.isFinite(focusRegion.longitudeDelta) ||
      focusRegion.latitudeDelta <= 0 ||
      focusRegion.longitudeDelta <= 0
    ) {
      log.warn("focusRegion inválido — abortando animateToRegion:", focusRegion);
      return;
    }
    // 400 ms es suficiente: el delta ya viene dimensionado por boundsToRegion
    // (no necesita una transición larga para "acercarse"), y reduce el tiempo
    // total desde que el usuario selecciona una ubicación hasta que la ve.
    try {
      nativeMapRef.current?.animateToRegion(focusRegion, 400);
    } catch (e) {
      // El mapa se está desmontando o `focusRegion` no es válido (poco
      // probable, ya validamos arriba). Silenciar para no crashear.
      if (__DEV__) log.warn("animateToRegion (focus) falló:", (e as Error)?.message);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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
      autoFitTimerRef.current = setTimeout(() => {
        if (focusRegionRef.current) return;
        if (!mountedRef.current) return; // se desmontó durante el setTimeout
        if (!nativeMapRef.current) return;
        try {
          nativeMapRef.current.animateToRegion(region, 1000);
        } catch (e) {
          if (__DEV__) log.warn("animateToRegion (auto-fit) falló:", (e as Error)?.message);
        }
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

  // `initialRegion` SOLO se usa en el primer mount de MapView. Si al montar ya
  // tenemos un `focusRegion` (caso típico: el usuario seleccionó una ubicación
  // en el buscador y navegó al mapa con `selectedLocation` en el contexto),
  // partimos directamente de esa región en vez del fallback de Monterrey +
  // auto-fit posterior. Eso elimina el "flash" de mapa genérico y la espera
  // del geocoding antes de que la cámara llegue a la zona.
  const initialRegion = useMemo(() => {
    if (focusRegion) return focusRegion;
    const region = calculateRegionWithPadding();
    return (
      region || {
        latitude: 25.6866,
        longitude: -100.3161,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }
    );
    // calculateRegionWithPadding lee `properties`, así que depende de él.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, focusRegion]);

  // ── PriceBadge y ClusterBubble están definidos a NIVEL DE MÓDULO arriba.
  // Definirlos aquí dentro causaría que React los viera como un tipo nuevo en
  // cada render y desmontara/remontara todo su árbol de Views, lo que inunda
  // el commit de Fabric con mounts/unmounts innecesarios (mismo anti-patrón
  // que ya corregimos con `MemoizedPropertyMap` en MapSearch.tsx). ──

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
    try {
      nativeMapRef.current?.animateToRegion(region, 600);
    } catch (e) {
      if (__DEV__) log.warn("animateToRegion (highlighted) falló:", (e as Error)?.message);
    }
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

  // ── Markers memoizados por id para estabilizar la identidad de los hijos
  // del MapView. Sin esto, cada recálculo de `clusters` (cambio de region,
  // filtro, etc.) genera un array de React elements NUEVO, lo que obliga a
  // reconciliar TODOS los `<Marker>` aunque la mayoría no hayan cambiado.
  // En iOS, ese recambio masivo de children en un solo commit de Fabric ha
  // llegado a romper el `RCTLegacyViewManagerInteropComponentView` (mismo
  // síntoma que el workaround `drainDraftPoints` para vértices). ──

  // Handles estables para los markers (la lista cambia de referencia, pero los
  // handlers leen refs/estado, así que no necesitamos recrearlos en cada render).
  // Usamos un ref para que la callback siempre llame al `handleClusterPress`
  // más reciente (que a su vez lee `superclusterIndex`/refs, no se queda
  // obsoleto entre renders).
  const handleClusterPressRef = useRef<(clusterId: number) => void>(() => {});
  handleClusterPressRef.current = handleClusterPress;
  const handleClusterPressStable = useCallback(
    (clusterId: number) => handleClusterPressRef.current(clusterId),
    []
  );

  // ── LOG TEMPORAL DE DIAGNÓSTICO (crash iOS al entrar al mapa) ─────────────
  // Vuelca TODO lo que llega al mapa: props, coords por propiedad, polígonos,
  // pins, region y clústeres. Sirve para ver qué devuelve la búsqueda y detectar
  // datos anómalos (coords faltantes/NaN, polígonos raros, etc.).
  // ⚠️ ELIMINAR cuando se resuelva el crash de iOS.
  const mapEntrySigRef = useRef<string>("");
  useEffect(() => {
    if (!__DEV__) return;
    const sig = `${properties.length}|${confirmedPolygons?.length ?? 0}|${searchedLocationPins?.length ?? 0}|${draftPolygonPoints?.length ?? 0}`;
    if (sig === mapEntrySigRef.current) return;
    mapEntrySigRef.current = sig;

    const coordsOf = (p: any) => ({
      lat: p.coordinates?.lat ?? p.latitud ?? null,
      lng: p.coordinates?.lng ?? p.longitud ?? null,
    });
    const sample = properties.slice(0, 10).map((p: any) => ({
      id: p.id,
      titulo: p.titulo,
      ...coordsOf(p),
      colonia: p.colonia,
      municipio: p.municipio,
      estado: p.estado,
      tipo: p.tipo_propiedad,
      valid: isValidCoord(coordsOf(p).lat, coordsOf(p).lng),
    }));
    const invalid = properties.filter((p: any) => {
      const c = coordsOf(p);
      return !isValidCoord(c.lat, c.lng);
    });

    log.warn(
      `[MapEntry] properties=${properties.length} | conCoordsInvalidas=${invalid.length} | highlighted=${highlightedPropertyId ?? "-"} | drawingMode=${drawingMode}`,
    );
    log.warn(`[MapEntry] muestra (10 de ${properties.length}):`, JSON.stringify(sample, null, 2));
    if (invalid.length > 0) {
      log.warn(
        "[MapEntry] PROPS CON COORDS INVÁLIDAS:",
        JSON.stringify(
          invalid.slice(0, 20).map((p: any) => ({
            id: p.id,
            titulo: p.titulo,
            ...coordsOf(p),
            raw_coordinates: p.coordinates,
            raw_latitud: p.latitud,
            raw_longitud: p.longitud,
          })),
          null,
          2,
        ),
      );
    }
    if (properties.length > 0 && properties.length <= 40) {
      log.warn(
        "[MapEntry] TODAS las props (<=40):",
        JSON.stringify(properties.map((p: any) => ({ id: p.id, ...coordsOf(p) })), null, 2),
      );
    }
    log.warn(
      "[MapEntry] confirmedPolygons:",
      JSON.stringify(
        (confirmedPolygons ?? []).map((poly, i) => ({
          i,
          vertices: poly?.length ?? 0,
          valid: isValidPolygon(poly),
          first: poly?.[0] ?? null,
          last: poly?.[poly.length - 1] ?? null,
        })),
        null,
        2,
      ),
    );
    log.warn(
      "[MapEntry] searchedLocationPins:",
      JSON.stringify(searchedLocationPins ?? [], null, 2),
    );
    log.warn(
      "[MapEntry] draftPolygonPoints:",
      JSON.stringify(
        (draftPolygonPoints ?? []).map((pt, i) => ({
          i,
          pt,
          valid: isValidCoord(pt?.latitude, pt?.longitude),
        })),
        null,
        2,
      ),
    );
    log.warn("[MapEntry] focusRegion:", JSON.stringify(focusRegion ?? null));
  }, [properties, confirmedPolygons, searchedLocationPins, draftPolygonPoints, highlightedPropertyId, drawingMode, focusRegion]);

  // Log de montaje/desmontaje: si la pantalla entra/sale o el MapView se remonta
  // por un key/X en un padre, se ve claramente aquí.
  useEffect(() => {
    if (!__DEV__) return;
    log.warn("[MapEntry] PropertyMap MOUNT");
    return () => log.warn("[MapEntry] PropertyMap UNMOUNT");
  }, []);

  // 1) Cluster touch targets.
  // NOTA: NO se renderean hasta que el MapView nativo haya disparado
  // `onMapReady` (mapReady === true). Eso separa el commit de mount del
  // MapView del commit de mount de sus children — clave para evitar el
  // crash iOS del interop legacy de react-native-maps.
  // Dibujando no se montan: así cada toque llega al MapView y se añade como
  // vértice, en vez de abrir la propiedad o hacer zoom en el clúster.
  const clusterTouchMarkers = useMemo(() => {
    if (!mapReady || drawingMode) return [] as React.ReactNode[];
    const result = clusters
      .filter((c: any) => c.properties.cluster)
      .map((cluster: any) => {
        if (!cluster?.geometry?.coordinates) return null;
        const [lng, lat] = cluster.geometry.coordinates;
        if (!isValidCoord(lat, lng)) {
          // Render puro: solo loguear, no insertar en la BD desde el render.
          // El marker con coords inválidas NO se renderiza para evitar el
          // crash iOS de `RCTLegacyViewManagerInteropComponentView`.
          log.warn("[MapDebug] cluster_coord_invalida:", cluster.id, lat, lng);
          return null;
        }
        // Key estable basado en coordenadas: cuando supercluster re-clusteriza
        // (ej. cambio de zoom), el `cluster.id` cambia pero las coordenadas
        // del centroide se mantienen similares. Usar coords como key evita
        // que React desmonte/remonte el marker nativo en cada re-clustering,
        // lo que es una causa conocida de crashes iOS en react-native-maps.
        const stableKey = `cluster-${lat.toFixed(5)}-${lng.toFixed(5)}-${cluster.properties.point_count ?? 1}`;
        return (
          <Marker
            key={stableKey}
            identifier={stableKey}
            coordinate={{ latitude: lat, longitude: lng }}
            onPress={() => handleClusterPressStable(cluster.id)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
            opacity={0}
          />
        );
      })
      .filter(Boolean) as React.ReactNode[];
    // LOG TEMPORAL — diagnóstico crash iOS
    if (__DEV__ && result.length > 0 && result.length < 20) {
      log.debug(
        `[MapDebug] clusterTouchMarkers=${result.length} (${clusters.filter((c: any) => c.properties.cluster).length} total clusters, ${clusters.length - result.length} filtrados como null)`,
      );
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, handleClusterPressStable, mapReady, drawingMode]);

  // 2) Individual property markers (invisibles, capturan el toque).
  // El `onPress` se pasa a través de `handleIndividualMarkerPress` (estable,
  // definido arriba) que lee refs internamente para no cambiar la identidad
  // del handler entre renders. Esto evita que el interop de react-native-maps
  // vea un cambio de prop en cada render y re-serialize el marker.
  // También se difiere hasta `mapReady` (mismo motivo que clusterTouchMarkers).
  const individualPropertyMarkers = useMemo(() => {
    if (!mapReady || drawingMode) return [] as React.ReactNode[];
    const candidates = clusters.filter((c: any) => !c.properties.cluster);
    const result = candidates
      .map((point: any) => {
        const propertyId = point.properties.propertyId as string;
        const p = propertyMap.get(propertyId);
        if (!p) return null;
        const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
        const lng = p.coordinates?.lng ?? p.longitud ?? undefined;
        if (!isValidCoord(lat, lng)) {
          // LOG TEMPORAL — diagnóstico crash iOS
          if (__DEV__) {
            log.warn(
              "[MapDebug] INDIVIDUAL_MARKER_COORD_INVALIDA:",
              "id=", p.id,
              "lat=", lat,
              "lng=", lng,
              "raw.coordinates=", JSON.stringify(p.coordinates),
              "raw.latitud=", p.latitud,
              "raw.longitud=", p.longitud,
            );
          }
          return null;
        }
        const numLat = Number(lat);
        const numLng = Number(lng);
        return (
          <Marker
            key={p.id}
            // identifier estable por propiedad: React reconcilia el marker nativo
            // (mismo AIRMapMarker) en lugar de desmontar/remontar. Esto evita
            // el crash iOS de react-native-maps 1.20.x al re-add markers
            // durante cambios rápidos de filtros.
            identifier={`prop-${p.id}`}
            coordinate={{ latitude: numLat, longitude: numLng }}
            onPress={() => handleIndividualMarkerPress(p.id, numLat, numLng, p)}
            opacity={0}
            tracksViewChanges={false}
          />
        );
      })
      .filter(Boolean) as React.ReactNode[];
    // LOG TEMPORAL — diagnóstico crash iOS
    if (__DEV__) {
      const filtered = candidates.length - result.length;
      log.debug(
        `[MapDebug] individualPropertyMarkers=${result.length} (candidatos=${candidates.length}, filtrados=${filtered})`,
      );
      // Muestra hasta 3 props con sus coords (las primeras) para ver si hay algo raro
      if (result.length > 0 && result.length <= 5) {
        const ids = clusters
          .filter((c: any) => !c.properties.cluster)
          .slice(0, 3)
          .map((c: any) => {
            const p = propertyMap.get(c.properties.propertyId);
            return p
              ? { id: p.id, lat: p.coordinates?.lat ?? p.latitud, lng: p.coordinates?.lng ?? p.longitud, colonia: p.colonia, municipio: p.municipio, estado: (p as any).estado }
              : { id: c.properties.propertyId, missing: true };
          });
        log.debug("[MapDebug] individualPropertyMarkers sample:", JSON.stringify(ids, null, 2));
      }
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters, propertyMap, mapReady, drawingMode, handleIndividualMarkerPress]);

  // 3) Searched location pins (los del buscador de inicio / chips).
  // También se difiere hasta `mapReady` (mismo motivo).
  const searchedLocationPinMarkers = useMemo(() => {
    if (!mapReady) return [] as React.ReactNode[];
    if (!searchedLocationPins) return [] as React.ReactNode[];
    // REV08-08: si hay una propiedad a menos de ~60 m del pin, el pin no se dibuja (taparia su marcador).
    const hasPropertyNear = (lat: number, lng: number) => {
      const dLat = 60 / 111320;
      const dLng = 60 / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
      return properties.some((p) => {
        const plat = p.coordinates?.lat ?? p.latitud ?? undefined;
        const plng = p.coordinates?.lng ?? p.longitud ?? undefined;
        if (plat === undefined || plng === undefined || isNaN(plat) || isNaN(plng)) return false;
        return Math.abs(plat - lat) <= dLat && Math.abs(plng - lng) <= dLng;
      });
    };
    const result = searchedLocationPins
      .filter((pin) => isValidCoord(pin.latitude, pin.longitude))
      .filter((pin) => !hasPropertyNear(pin.latitude, pin.longitude))
      .map((pin) => (
        <Marker
          key={`searched-pin-${pin.key}`}
          coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
          pinColor={COLORS.error}
          title="Ubicación buscada"
          zIndex={0}
          tracksViewChanges={false}
        />
      ));
    if (__DEV__ && result.length > 0) {
      log.debug(
        `[MapDebug] searchedLocationPinMarkers=${result.length} (input=${searchedLocationPins.length})`,
      );
    }
    return result;
  }, [searchedLocationPins, mapReady, properties]);

  // ── LOG TEMPORAL DE DIAGNÓSTICO — resumen de TODO lo que se renderiza como
  // hijo del <MapView>. Cada cambio aquí equivale a un commit de Fabric que
  // inserta/elimina annotations nativas. ⚠️ ELIMINAR cuando se resuelva el crash.
  useEffect(() => {
    if (!__DEV__) return;
    log.warn(
      `[MapRender] clusters=${clusterTouchMarkers.length} individuales=${individualPropertyMarkers.length} ` +
        `pins=${searchedLocationPinMarkers.length} ` +
        `polygonsValidos=${(confirmedPolygons ?? []).filter(isValidPolygon).length}/${confirmedPolygons?.length ?? 0} ` +
        `draftPts=${draftPolygonPoints.length} mapReady=${mapReady}`,
    );
    // KEYS exactos de cada tipo de child del <MapView>. Si entre renders los
    // keys se conservan, React reconcilia; si cambian, hay unmount/mount y por
    // tanto mount/unmount de AIRMapMarker nativo → es justo el path que rompe
    // el interop de Fabric en iOS. Si vemos keys que aparecen/desaparecen
    // sin razón entre dos renders consecutivos, eso es lo que dispara el
    // `insertObject:atIndex: nil`.
    if (__DEV__) {
      const ck = clusterTouchMarkers.map((m: any) => m?.key).slice(0, 30);
      const ik = individualPropertyMarkers.map((m: any) => m?.key).slice(0, 30);
      const pk = searchedLocationPinMarkers.map((m: any) => m?.key).slice(0, 30);
      const fk = (draftPolygonPoints ?? [])
        .map((_, i) => `vertex-${i}`)
        .slice(0, 30);
      const polK = (confirmedPolygons ?? [])
        .map((_, i) => `confirmed-polygon-${i}`)
        .slice(0, 30);
      log.warn(
        `[MapKeys] clusters=${JSON.stringify(ck)} individuales=${JSON.stringify(ik)} ` +
          `pins=${JSON.stringify(pk)} draftVertices=${JSON.stringify(fk)} ` +
          `polygons=${JSON.stringify(polK)}`,
      );
    }
  }, [
    clusterTouchMarkers,
    individualPropertyMarkers,
    searchedLocationPinMarkers,
    confirmedPolygons,
    draftPolygonPoints,
    mapReady,
  ]);

  // Contador de renders del componente (sube con cada re-render). Útil para
  // correlacionar logs de MapSearch con logs de PropertyMap cuando el flujo
  // asíncrono genera muchos renders seguidos.
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  if (__DEV__) {
    if (renderCountRef.current === 1 || renderCountRef.current % 10 === 0) {
      log.warn(`[MapRender] renderCount=${renderCountRef.current}`);
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={nativeMapRef}
        style={styles.mapNative}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setMapSize((prev) =>
              prev && prev.width === width && prev.height === height
                ? prev
                : { width, height }
            );
          }
        }}
        mapType={mapTypeId}
        provider={
          Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
        }
        initialRegion={initialRegion}
        onMapReady={() => {
          if (__DEV__) log.warn("[MapEntry] onMapReady | initialRegion=", JSON.stringify(initialRegion));
          setMapReady(true);
          // Calibrar offset cuando el mapa está listo (puede haber un inset
          // por safe area en iOS que el wrapper de RN no refleja).
          calibrateOffset(true).catch(() => {});
        }}
        onRegionChange={(region) => {
          regionRef.current = region;
          updateOverlayPositions(region);
        }}
        onRegionChangeComplete={(region) => {
          regionRef.current = region;
          setCurrentRegion(region);
          updateOverlayPositions(region);
          // Re-calibrar después de cada gesto completado, por si la UI del
          // MKMapView (brújula, escala) cambió y eso afecta el offset entre
          // wrapper y MKMapView nativo.
          calibrateOffset().catch(() => {});
          log.debug(`onRegionChangeComplete: latDelta=${region.latitudeDelta.toFixed(3)} center=${region.latitude.toFixed(3)},${region.longitude.toFixed(3)}`);
        }}
        // Dibujando, un toque simple añade punto. Antes solo servía el long
        // press: en iOS se perdía en cuanto el dedo se movía un poco, y de ahí
        // la sensación de que "a veces el punto no se marca".
        onPress={(e) => {
          if (drawingMode && onMapPress) {
            onMapPress(e.nativeEvent.coordinate);
          }
        }}
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
          isValidPolygon(polygon) ? (
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
        {isValidCoord(draftPolygonPoints[0]?.latitude, draftPolygonPoints[0]?.longitude) &&
          draftPolygonPoints.length >= 2 && (
          <Polyline
            coordinates={draftPolygonPoints}
            strokeColor={COLORS.primary}
            strokeWidth={2.5}
            lineDashPattern={DRAFT_DASH_PATTERN}
          />
        )}
        {isValidPolygon(draftPolygonPoints) && draftPolygonPoints.length >= 3 && (
          <Polygon
            coordinates={draftPolygonPoints}
            fillColor="rgba(69,160,165,0.12)"
            strokeColor="transparent"
            strokeWidth={0}
          />
        )}

        {/* Vértices del borrador. El primero cierra el polígono al tocarlo:
            en iOS el marker intercepta el toque y nunca llegaba al MapView,
            así que el "presiona el primer punto para cerrar" no funcionaba. */}
        {draftPolygonPoints.map((pt, idx) =>
          isValidCoord(pt?.latitude, pt?.longitude) ? (
            <DraftVertex
              key={`vertex-${idx}`}
              coord={pt}
              isFirst={idx === 0}
              // El primer vértice lleva onPress SIEMPRE (estable) para que iOS lo
              // registre al crearse; no hace nada hasta que hay 3+ puntos.
              onPress={idx === 0 ? handleFirstVertexPress : undefined}
            />
          ) : null,
        )}
        {/* Invisible cluster touch targets. Memoizado por cluster-id para
            estabilizar la identidad: si la región se recalcula y un cluster
            mantiene su id, React reusa el mismo `<Marker>` (no se desmonta). */}
        {clusterTouchMarkers}

        {/* Markers individuales — invisibles (detectan toque), solo para props no agrupadas. */}
        {individualPropertyMarkers}

        {/* Pins clásicos de las ubicaciones buscadas (color distinto al de las propiedades) */}
        {searchedLocationPinMarkers}
      </MapView>

      {/* Overlay absoluto para los precios (Inmune a los recortes de Android).
          Cuando varias propiedades comparten coordenada exacta (típico de
          EasyBroker, que fija el centro de la colonia) sus badges quedaban
          EXACTAMENTE encimados y parecía uno solo. Aquí dibujamos UN solo badge
          por coordenada y le añadimos un contador "N" para dejar claro que hay
          varias; el toque ya abre el selector (CoincidentPropertiesSheet). */}
      {Platform.OS !== "web" && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {(() => {
            const drawnCoincidentKeys = new Set<string>();
            return Object.entries(overlayPositions).map(([id, pos]) => {
              const p = propertyMap.get(id);
              if (!p) return null;
              if (!individualPropertyIds.has(id)) return null;
              if (!Number.isFinite((pos as any)?.x) || !Number.isFinite((pos as any)?.y)) return null;

              // Conteo de propiedades en la MISMA coordenada; si ya dibujamos un
              // badge para esta coordenada, omitimos los duplicados encimados.
              const lat = p.coordinates?.lat ?? p.latitud ?? undefined;
              const lng = p.coordinates?.lng ?? p.longitud ?? undefined;
              const coincKey =
                lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)
                  ? coincidenceKey(lat, lng)
                  : null;
              const stackCount = coincKey
                ? coincidentGroups.get(coincKey)?.length ?? 1
                : 1;
              if (coincKey && stackCount > 1) {
                if (drawnCoincidentKeys.has(coincKey)) return null;
                drawnCoincidentKeys.add(coincKey);
              }

              const isHighlighted = p.id === highlightedPropertyId;
              const priceText = formatPrice(p.price || 0, p.currency);
              const bgColor = isHighlighted ? COLORS.warning : COLORS.primary;

              return (
                <PriceBadge
                  key={`price-${p.id}`}
                  x={(pos as any).x}
                  y={(pos as any).y}
                  priceText={priceText}
                  bgColor={bgColor}
                  stackCount={stackCount}
                />
              );
            });
          })()}
        </View>
      )}

      {/* Cluster bubbles overlay — rendered outside MapView para garantizar visibilidad en Android */}
      {Platform.OS !== "web" && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Object.entries(clusterOverlayPositions).map(([key, data]: [string, any]) => (
            <ClusterBubble key={key} x={data.x} y={data.y} count={data.count} />
          ))}
        </View>
      )}

      {/* Botón de cierre del polígono: overlay REAL de RN sobre el primer
          vértice. En iOS el onPress del Marker nativo exigía doble toque (la
          anotación de Apple Maps se "selecciona" en el primer toque y solo
          dispara el onPress en el segundo). Un Pressable de RN por encima del
          mapa captura el toque de forma fiable al primer intento en ambas
          plataformas; su posición se calcula con pointForCoordinate. El anillo
          resaltado indica "toca aquí para cerrar". */}
      {Platform.OS !== "web" &&
        drawingMode &&
        firstVertexScreenPos &&
        draftPolygonPoints.length >= 3 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web")
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                try {
                  onCloseDraftPolygon?.();
                } catch (e) {
                  if (__DEV__) log.warn("onCloseDraftPolygon falló:", (e as Error)?.message);
                }
              }}
              hitSlop={10}
              style={{
                position: "absolute",
                left: firstVertexScreenPos.x - 26,
                top: firstVertexScreenPos.y - 26,
                width: 52,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={vertexStyles.closeRing} />
            </Pressable>
          </View>
        )}

      {properties.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No hay propiedades para mostrar</Text>
        </View>
      )}

      {/* Selector de tipo de mapa — renderizado AL FINAL (después del MapView)
          para garantizar visibilidad sobre el MapView nativo en Android */}
      {(() => {
        const activeOption =
          MAP_TYPE_OPTIONS.find((o) => o.id === mapTypeId) ??
          MAP_TYPE_OPTIONS[0];
        const ActiveIcon = activeOption.Icon;
        // Deja libre el hint "Mantén presionado el mapa..." que se muestra
        // en topOffset + 12; se baja de más para evitar cualquier solape.
        const buttonTop = topOffset + 96;
        return (
          <>
            {mapTypeMenuOpen && (
              <Pressable
                style={styles.mapTypeBackdrop}
                onPress={() => setMapTypeMenuOpen(false)}
              />
            )}
            <Pressable
              style={[styles.mapTypeButton, { top: buttonTop }]}
              onPress={() => setMapTypeMenuOpen((v) => !v)}
            >
              <View style={styles.mapTypeButtonIcon}>
                <ActiveIcon size={10} />
                <Text style={styles.mapTypeButtonText}>
                  {activeOption.label}
                </Text>
                <ChevronDown size={10} />
              </View>
            </Pressable>
            {mapTypeMenuOpen && (
              <View style={[styles.mapTypeMenu, { top: buttonTop + 44 }]}>
                {MAP_TYPE_OPTIONS.filter(
                  (o) => o.id !== "terrain" || Platform.OS === "android",
                ).map((option) => {
                  const OptionIcon = option.Icon;
                  const isActive = option.id === mapTypeId;
                  return (
                    <Pressable
                      key={option.id}
                      style={[
                        styles.mapTypeMenuItem,
                        isActive && styles.mapTypeMenuItemActive,
                      ]}
                      onPress={() => {
                        setMapTypeId(option.id);
                        setMapTypeMenuOpen(false);
                        if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
                      }}
                    >
                      <OptionIcon size={14} />
                      <Text style={styles.mapTypeMenuItemText}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        );
      })()}
    </View>
  );
};

const MAP_TYPE_OPTIONS = [
  { id: "standard", label: "Mapa", Icon: MapIcon },
  { id: "satellite", label: "Satélite", Icon: Globe },
  { id: "hybrid", label: "Híbrido", Icon: Layers },
  { id: "terrain", label: "Terreno", Icon: Mountain }, // se filtra fuera de Android
] as const;

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
    top: "75%",
    left: "45%",
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
    zIndex: 3,
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
  mapTypeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  mapTypeMenu: {
    position: "absolute",
    top: 56,
    right: 16,
    zIndex: 3,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    minWidth: 130,
  },
  mapTypeMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  mapTypeMenuItemActive: {
    backgroundColor: COLORS.primary + "22",
  },
  mapTypeMenuItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
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
  dotFirst: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
  },
  // Área tocable transparente alrededor del primer vértice: agranda el objetivo
  // del toque de cierre sin cambiar el tamaño visible del puntito.
  firstHitbox: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  // Anillo resaltado del botón de cierre (overlay de RN sobre el primer vértice).
  closeRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: COLORS.primary,
    backgroundColor: "rgba(69,160,165,0.22)",
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
});

/**
 * Vértice del polígono en borrador.
 * Inicia con tracksViewChanges activo para que react-native-maps capture el
 * contenido del marker (si arranca en false, el primer punto queda invisible),
 * y lo desactiva tras el primer layout para no penalizar el rendimiento.
 */
function DraftVertex({
  coord,
  isFirst = false,
  onPress,
}: {
  coord: PolygonCoord;
  isFirst?: boolean;
  onPress?: () => void;
}) {
  const [track, setTrack] = useState(true);
  const handleLayout = () => {
    if (track) setTrack(false);
  };
  return (
    <Marker
      coordinate={coord}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={track}
      onPress={onPress}
      // Sin esto, el toque sobre el vértice también llega al MapView y añade
      // un punto encima del primero en vez de cerrar el polígono.
      stopPropagation={Boolean(onPress)}
    >
      {/* El primer vértice es el objetivo del toque de cierre: se le da un área
          tocable amplia y transparente (44px, mínimo de Apple) alrededor del
          puntito visible, para poder atinarle con el dedo en iOS. El puntito es
          siempre mayor que el resto. El aspecto no puede depender de `onPress`
          porque, con tracksViewChanges ya en false, iOS no repintaría. */}
      {isFirst ? (
        <View style={vertexStyles.firstHitbox} onLayout={handleLayout}>
          <View style={[vertexStyles.dot, vertexStyles.dotFirst]}>
            <View style={vertexStyles.dotInner} />
          </View>
        </View>
      ) : (
        <View style={vertexStyles.dot} onLayout={handleLayout}>
          <View style={vertexStyles.dotInner} />
        </View>
      )}
    </Marker>
  );
}
