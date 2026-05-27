import React, { useEffect, useRef, useState } from "react";
import MapSearch from "../../components/map/MapSearch";
import { useApp } from "../../context/AppContext";
import { useMapProperties, MapServerFilters } from "@/hooks/useMapProperties";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";
import { ScreenWrapper } from "../../screens/ScreenWrapper";

function extractServerFilters(filters: ReturnType<typeof usePropertyFiltersStore.getState>["filters"]): MapServerFilters {
  const f: MapServerFilters = {};

  if (filters.tipoPropiedad) f.tipoPropiedad = filters.tipoPropiedad;
  if (filters.subtipo?.length > 0) f.subtipo = filters.subtipo;

  // Prioridad 1: chips con bounds geográficos (nuevo sistema Google Places)
  // Usar el bounds del primer chip con bounds disponibles para el filtro server-side.
  // El filtrado preciso por múltiples bounds se hace client-side en usePropertyFilters.
  const chipWithBounds = filters.locationChips?.find((c) => c.bounds);
  if (chipWithBounds?.bounds) {
    // Si hay múltiples chips, expandir los bounds para abarcar todos
    let north = chipWithBounds.bounds.north;
    let south = chipWithBounds.bounds.south;
    let east = chipWithBounds.bounds.east;
    let west = chipWithBounds.bounds.west;
    for (const chip of filters.locationChips) {
      if (!chip.bounds) continue;
      north = Math.max(north, chip.bounds.north);
      south = Math.min(south, chip.bounds.south);
      east = Math.max(east, chip.bounds.east);
      west = Math.min(west, chip.bounds.west);
    }
    f.bounds = { north, south, east, west };
  }

  // Prioridad 2: locationFilter base (texto) — fallback si no hay chips con bounds
  if (!f.bounds) {
    const loc = filters.locationFilter;
    if (loc.estado) f.estado = loc.estado;
    if (loc.municipio) f.municipio = loc.municipio;
    // Chips legacy sin bounds
    const coloniaChip = filters.locationChips?.find((c) => c.type === "colonia" && !c.bounds);
    if (coloniaChip?.locationFilter.colonia) {
      f.colonia = coloniaChip.locationFilter.colonia as string;
    }
    if (!f.municipio) {
      const munChip = filters.locationChips?.find(
        (c) => (c.type === "municipio" || c.type === "colonia") && !c.bounds,
      );
      if (munChip?.locationFilter.municipio) f.municipio = munChip.locationFilter.municipio;
    }
    if (!f.estado) {
      const estadoChip = filters.locationChips?.find((c) => c.locationFilter.estado && !c.bounds);
      if (estadoChip?.locationFilter.estado) f.estado = estadoChip.locationFilter.estado;
    }
  }

  // Habitaciones: solo pasar valor exacto (no "6+", "Más")
  if (filters.habitaciones && filters.habitaciones !== "No indicado") {
    const n = parseInt(filters.habitaciones);
    if (!isNaN(n)) f.habitacionesMin = n;
  }
  if (filters.banos && filters.banos !== "No indicado") {
    const n = parseInt(filters.banos);
    if (!isNaN(n)) f.banosMin = n;
  }
  if (filters.estacionamientos && filters.estacionamientos !== "No indicado") {
    const n = parseInt(filters.estacionamientos);
    if (!isNaN(n)) f.estacionamientosMin = n;
  }

  if (filters.m2ConstruccionMin) {
    const n = parseFloat(filters.m2ConstruccionMin.replace(/,/g, ""));
    if (!isNaN(n) && n > 0) f.m2ConstruccionMin = n;
  }
  if (filters.m2TerrenoMin) {
    const n = parseFloat(filters.m2TerrenoMin.replace(/,/g, ""));
    if (!isNaN(n) && n > 0) f.m2TerrenoMin = n;
  }

  // Comercial
  if (filters.tipoPropiedad === "comercial" && filters.comercialFilters) {
    const cf = filters.comercialFilters;
    if (cf.tipoUbicacion) f.tipoUbicacion = cf.tipoUbicacion;
    if (cf.frenteMin) {
      const n = parseFloat(cf.frenteMin);
      if (!isNaN(n) && n > 0) f.frenteMin = n;
    }
    if (cf.sobreAvenidaPrincipal) f.sobreAvenidaPrincipal = true;
    if (cf.enEsquina) f.enEsquina = true;
    if (cf.altaVisibilidad) f.altaVisibilidad = true;
    if (cf.altoFlujoVehicular) f.altoFlujoVehicular = true;
  }

  // Industrial
  if (filters.tipoPropiedad === "industrial" && filters.industrialFilters) {
    const inf = filters.industrialFilters;
    if (inf.ubicacion) f.ubicacionIndustrial = inf.ubicacion;
    if (inf.alturaLibre) f.alturaLibre = inf.alturaLibre;
    if (inf.energiaKva?.length > 0) f.energiaKva = inf.energiaKva;
    if (inf.areaOficinasMin) {
      const n = parseFloat(inf.areaOficinasMin);
      if (!isNaN(n) && n > 0) f.areaOficinasMin = n;
    }
    if (inf.patioManiobrasMin) {
      const n = parseFloat(inf.patioManiobrasMin);
      if (!isNaN(n) && n > 0) f.patioManiobrasMin = n;
    }
  }

  // Agrícola
  if (filters.tipoPropiedad === "agricola" && filters.agricolaFilters) {
    const ag = filters.agricolaFilters;
    if (ag.tiposAgua?.length > 0) f.tiposAgua = ag.tiposAgua;
    if (ag.concesionAgua) f.concesionAgua = true;
    if (ag.usoTerreno) f.usoTerreno = ag.usoTerreno;
    if (ag.tipoRiego) f.tipoRiego = ag.tipoRiego;
    if (ag.electricidad) f.infraElectricidad = true;
    if (ag.caminoAcceso) f.infraCaminoAcceso = true;
    if (ag.cercado) f.infraCercado = true;
    if (ag.pieCarretera) f.accesoCarretera = true;
    if (ag.accesCamiones) f.accesoCamiones = true;
  }

  return f;
}

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
