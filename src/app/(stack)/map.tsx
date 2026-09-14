import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapSearch from "../../components/map/MapSearch";
import { useApp } from "../../context/AppContext";
import { useMapProperties, MapServerFilters } from "@/hooks/useMapProperties";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";
import { extractServerFilters } from "@/utils/mapServerFilters";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { COLORS } from "@/constants/colors";

export default function MapScreen() {
  const { saveSearch } = useApp();
  const storeFilters = usePropertyFiltersStore((s) => s.filters);
  const { busquedaId } = useLocalSearchParams<{ busquedaId?: string }>();
  const [loadingBusqueda, setLoadingBusqueda] = useState(!!busquedaId);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!busquedaId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("busquedas_guardadas")
        .select("*")
        .eq("id", busquedaId)
        .maybeSingle();
      if (!cancelled && data && !error) {
        usePropertyFiltersStore.getState().setFiltersFromSearch(data as any);
      }
      if (!cancelled) setLoadingBusqueda(false);
    })();
    return () => { cancelled = true; };
  }, [busquedaId]);

  // Debounce: espera 600ms después del último cambio de filtro antes de refetching
  const [debouncedFilters, setDebouncedFilters] = useState<MapServerFilters>(
    () => extractServerFilters(storeFilters)
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedFilters(extractServerFilters(storeFilters));
    }, 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [storeFilters]);

  const { data: properties = [] } = useMapProperties(debouncedFilters);

  const safeStyle = {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingBottom: Math.max(insets.bottom, 10),
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  if (loadingBusqueda) {
    return (
      <View style={safeStyle}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={safeStyle}>
      <MapSearch
        properties={properties}
        onSaveSearch={(name, leadName, leadPhone) =>
          saveSearch(name, "", leadName, leadPhone)
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
