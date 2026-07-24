import React, { useEffect, useRef, useState } from "react";
import MapSearch from "../../components/map/MapSearch";
import { useApp } from "../../context/AppContext";
import { useMapProperties, MapServerFilters } from "@/hooks/useMapProperties";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";
import { extractServerFilters } from "@/utils/mapServerFilters";
import { ScreenWrapper } from "../../screens/ScreenWrapper";

export default function MapScreen() {
  const { saveSearch } = useApp();
  const storeFilters = usePropertyFiltersStore((s) => s.filters);

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

  return (
    <ScreenWrapper withHeader={false}>
      <MapSearch
        properties={properties}
        onSaveSearch={(name, leadName, leadPhone) =>
          saveSearch(name, "", leadName, leadPhone)
        }
      />
    </ScreenWrapper>
  );
}
