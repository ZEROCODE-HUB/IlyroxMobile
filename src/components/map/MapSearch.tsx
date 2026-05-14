import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Property } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { SearchFiltersBar } from "./SearchFiltersBar";
import { PropertyMap } from "./PropertyMap";
import { SearchFiltersModal } from "./SearchFiltersModal";
import PolygonDrawingOverlay from "./PolygonDrawingOverlay";
import {
  usePropertyFilters,
} from "@/hooks/usePropertyFilters";
import { router } from "expo-router";
import {
  PolygonCoord,
  LocationChip,
} from "@/store/propertyFiltersStore";
import {
  useLocationSearchStore,
  LocationSuggestionWithCount,
} from "@/store/locationSearchStore";
import { COLORS } from "@/constants/colors";
import { logger } from "@/utils/logger";

const log = logger.scoped("MapSearch");

interface MapSearchProps {
  properties: Property[];
  onSaveSearch: (name: string, leadName?: string, leadPhone?: string) => void;
}

const MapSearch: React.FC<MapSearchProps> = ({ properties, onSaveSearch }) => {
  const { user } = useAuth();
  const { selectedLocation } = useApp();

  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [highlightedPropertyId, setHighlightedPropertyId] = useState<string | null>(null);

  // ── Polígonos (múltiples) ──
  const [drawingMode, setDrawingMode] = useState(false);
  const [draftPoints, setDraftPoints] = useState<PolygonCoord[]>([]);

  // ── Búsqueda de zonas ──
  const [isZoneSearchOpen, setIsZoneSearchOpen] = useState(false);
  const [zoneQuery, setZoneQuery] = useState("");
  const zoneInputRef = useRef<TextInput>(null);
  const { suggestions, isLoading, searchLocations, clearSuggestions } =
    useLocationSearchStore();

  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [focusRegion, setFocusRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  const {
    filteredProperties,
    addPolygon,
    removePolygon,
    addLocationChip,
    removeLocationChip,
    clearFilters,
    hasActiveFilters,
    filters,
  } = usePropertyFilters(properties, null);

  // ── Geocodificar selectedLocation solo para navegación del mapa (no aplica filtro base) ──
  useEffect(() => {
    if (selectedLocation) {
      const geocode = async () => {
        try {
          if (!googleApiKey) return;
          const q = encodeURIComponent(`${selectedLocation.name}, Mexico`);
          const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${q}&region=mx&key=${googleApiKey}`;
          const res = await fetch(url);
          const json = await res.json();
          const result = json.results?.[0];
          if (result?.geometry) {
            const { location, bounds, viewport } = result.geometry;
            const b = bounds || viewport;
            if (b) {
              const minLat = Math.min(b.southwest.lat, b.northeast.lat);
              const maxLat = Math.max(b.southwest.lat, b.northeast.lat);
              const minLng = Math.min(b.southwest.lng, b.northeast.lng);
              const maxLng = Math.max(b.southwest.lng, b.northeast.lng);
              const latSpan = Math.max(maxLat - minLat, 0);
              const lngSpan = Math.max(maxLng - minLng, 0);
              const type = selectedLocation.type;
              const MIN_DELTA = type === "colonia" ? 0.02 : type === "municipio" ? 0.04 : 0.03;
              const MAX_DELTA = type === "colonia" ? 0.1 : type === "municipio" ? 0.5 : 3.0;
              const latDelta = Math.min(Math.max(latSpan * 1.4 || MIN_DELTA, MIN_DELTA), MAX_DELTA);
              const lngDelta = Math.min(Math.max(lngSpan * 1.4 || MIN_DELTA, MIN_DELTA), MAX_DELTA);
              setFocusRegion({
                latitude: (minLat + maxLat) / 2,
                longitude: (minLng + maxLng) / 2,
                latitudeDelta: latDelta,
                longitudeDelta: lngDelta,
              });
            } else if (location) {
              const type = selectedLocation.type;
              const fallbackDelta = type === "colonia" ? 0.03 : type === "municipio" ? 0.06 : 0.05;
              setFocusRegion({
                latitude: location.lat,
                longitude: location.lng,
                latitudeDelta: fallbackDelta,
                longitudeDelta: fallbackDelta,
              });
            }
          }
        } catch (e) {
          log.warn("Error geocoding location", e);
        }
      };
      geocode();
    } else {
      setFocusRegion(null);
    }
  }, [selectedLocation]);

  // ── Debounce búsqueda de zonas ──
  useEffect(() => {
    if (!isZoneSearchOpen) return;
    const timer = setTimeout(() => {
      if (zoneQuery.trim().length >= 2) {
        searchLocations(zoneQuery.trim());
      } else {
        clearSuggestions();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [zoneQuery, isZoneSearchOpen]);

  const openZoneSearch = () => {
    setIsZoneSearchOpen(true);
    setTimeout(() => zoneInputRef.current?.focus(), 100);
  };

  const closeZoneSearch = () => {
    setIsZoneSearchOpen(false);
    setZoneQuery("");
    clearSuggestions();
  };

  const handleAddLocationChip = (loc: LocationSuggestionWithCount) => {
    const chip: LocationChip = {
      id: `${loc.type}-${loc.name}-${Date.now()}`,
      label: loc.name,
      type: loc.type as "estado" | "municipio" | "colonia",
      locationFilter: {
        estado: loc.estado_nombre || (loc.type === "estado" ? loc.name : ""),
        ciudad: "",
        municipio: loc.municipio_nombre || (loc.type === "municipio" ? loc.name : ""),
        colonia: loc.type === "colonia" ? loc.name : "",
      },
    };
    addLocationChip(chip);
    closeZoneSearch();
  };

  // ── Handlers de marker ──
  const handleMarkerPress = (propertyId: string, _property: Property) => {
    setHighlightedPropertyId(propertyId);
    setTimeout(() => {
      setHighlightedPropertyId(null);
      router.push({ pathname: "/property/[id]", params: { id: propertyId } });
    }, 1000);
  };

  // ── Handlers de polígono ──
  const handleLongPressMap = (coord: PolygonCoord) => {
    if (drawingMode) return;
    setDrawingMode(true);
    setDraftPoints([coord]);
  };

  const handleMapPress = (coord: PolygonCoord) => {
    if (!drawingMode) return;
    setDraftPoints((prev) => [...prev, coord]);
  };

  const handleCancelDrawing = () => {
    setDrawingMode(false);
    setDraftPoints([]);
  };

  const handleUndoPoint = () => setDraftPoints((prev) => prev.slice(0, -1));
  const handleClearDraft = () => setDraftPoints([]);

  const handleConfirmPolygon = () => {
    if (draftPoints.length < 3) return;
    addPolygon(draftPoints);
    setDraftPoints([]);
    setDrawingMode(false);
  };

  // ── Limpiar todo ──
  const handleClearAll = () => {
    clearFilters();
    setDraftPoints([]);
    setDrawingMode(false);
  };

  const locationChips = filters.locationChips;
  const polygonChips = filters.polygons.map((_, i) => ({
    index: i,
    label: `Zona ${i + 1}`,
  }));

  return (
    <View style={styles.container}>
      <SearchFiltersBar
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearAll}
        locationChips={locationChips}
        polygonChips={polygonChips}
        onAddZone={openZoneSearch}
        onRemoveChip={removeLocationChip}
        onRemovePolygon={removePolygon}
        onBack={() => router.back()}
      />

      {/* ── Overlay de búsqueda de zonas ── */}
      {isZoneSearchOpen && (
        <View style={styles.zoneSearchOverlay}>
          <View style={styles.zoneSearchInputRow}>
            <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={styles.zoneSearchIcon} />
            <TextInput
              ref={zoneInputRef}
              style={styles.zoneSearchInput}
              value={zoneQuery}
              onChangeText={setZoneQuery}
              placeholder="Buscar colonia, municipio, estado..."
              placeholderTextColor={COLORS.textTertiary}
              autoFocus
              returnKeyType="search"
            />
            <TouchableOpacity onPress={closeZoneSearch} hitSlop={8}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {isLoading && (
            <View style={styles.zoneSearchLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          )}

          <FlatList
            data={suggestions}
            keyExtractor={(item, index) => `${item.type}-${item.name}-${item.municipio_nombre ?? ""}-${item.estado_nombre ?? ""}-${index}`}
            keyboardShouldPersistTaps="handled"
            style={styles.zoneSearchList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.zoneSearchItem}
                onPress={() => handleAddLocationChip(item)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={
                    item.type === "estado"
                      ? "map-outline"
                      : item.type === "municipio"
                        ? "business-outline"
                        : "location-outline"
                  }
                  size={16}
                  color={COLORS.primary}
                  style={styles.zoneSearchItemIcon}
                />
                <View style={styles.zoneSearchItemText}>
                  <Text style={styles.zoneSearchItemName}>{item.name}</Text>
                  {(item.municipio_nombre || item.estado_nombre) && (
                    <Text style={styles.zoneSearchItemSub}>
                      {[item.municipio_nombre, item.estado_nombre]
                        .filter(Boolean)
                        .join(", ")}
                      {item.propertyCount != null && item.propertyCount > 0
                        ? ` · ${item.propertyCount} props`
                        : ""}
                    </Text>
                  )}
                </View>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !isLoading && zoneQuery.length >= 2 ? (
                <Text style={styles.zoneSearchEmpty}>Sin resultados para "{zoneQuery}"</Text>
              ) : null
            }
          />
        </View>
      )}

      {/* ── Mapa ── */}
      <View style={styles.mapContainer}>
        <PropertyMap
          properties={filteredProperties}
          onMarkerPress={drawingMode ? () => {} : handleMarkerPress}
          googleApiKey={googleApiKey}
          highlightedPropertyId={highlightedPropertyId}
          focusRegion={focusRegion}
          drawingMode={drawingMode}
          draftPolygonPoints={draftPoints}
          confirmedPolygons={filters.polygons}
          onMapPress={handleMapPress}
          onLongPressMap={handleLongPressMap}
        />
        <PolygonDrawingOverlay
          drawingMode={drawingMode}
          draftPoints={draftPoints}
          onCancel={handleCancelDrawing}
          onUndo={handleUndoPoint}
          onClear={handleClearDraft}
          onConfirm={handleConfirmPolygon}
        />

      </View>

      {/* Barra inferior — siempre visible (oculta durante modo dibujo) */}
      {!drawingMode && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.refineSearchBtn}
            onPress={() => setShowFiltersModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="options-outline" size={18} color={COLORS.white} />
            <Text style={styles.refineSearchBtnText}>Refinar Búsqueda</Text>
            {hasActiveFilters && <View style={styles.activeFilterDot} />}
          </TouchableOpacity>
        </View>
      )}

      <SearchFiltersModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        onViewResults={() => {
          setShowFiltersModal(false);
          router.push({ pathname: "/map-results" } as any);
        }}
        filteredPropertiesCount={filteredProperties.length}
        userId={user?.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mapContainer: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  refineSearchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    position: "relative",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  refineSearchBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  activeFilterDot: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.warning,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  // Overlay de búsqueda de zonas
  zoneSearchOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    maxHeight: 380,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  zoneSearchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  zoneSearchIcon: {
    flexShrink: 0,
  },
  zoneSearchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  zoneSearchLoading: {
    paddingVertical: 12,
    alignItems: "center",
  },
  zoneSearchList: {
    maxHeight: 280,
  },
  zoneSearchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
    gap: 10,
  },
  zoneSearchItemIcon: {
    flexShrink: 0,
  },
  zoneSearchItemText: {
    flex: 1,
  },
  zoneSearchItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  zoneSearchItemSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  zoneSearchEmpty: {
    padding: 16,
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: "center",
  },
});

export default MapSearch;
