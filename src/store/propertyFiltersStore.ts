import { create } from "zustand";
import { GeoBounds, busquedas_guardadas } from "@/types";
import type { CountryCode } from "@/lib/location/types";

export interface PolygonCoord {
  latitude: number;
  longitude: number;
}

export interface LocationChip {
  id: string;
  label: string;
  type: "estado" | "municipio" | "colonia" | "zona";
  /**
   * Bounds geográficos del lugar — fuente principal del filtro.
   * Cuando está presente, el filtrado usa BETWEEN lat/lng en lugar de ilike.
   */
  bounds?: GeoBounds;
  /**
   * @deprecated Usar `bounds` cuando sea posible.
   * Se mantiene para compatibilidad con chips sin bounds.
   */
  locationFilter: {
    estado: string;
    ciudad: string;
    municipio: string;
    colonia: string | string[];
  };
}

export interface ComercialFilters {
  tipoUbicacion: string;
  frenteMin: string;
  nivel: string;
  sobreAvenidaPrincipal: boolean;
  enEsquina: boolean;
  altaVisibilidad: boolean;
  altoFlujoVehicular: boolean;
}

export interface IndustrialFilters {
  ubicacion: string;
  alturaLibre: string;
  energiaKva: string[];
  areaOficinasMin: string;
  patioManiobrasMin: string;
}

export interface AgricolaFilters {
  tiposAgua: string[];
  concesionAgua: boolean;
  usoTerreno: string;
  tipoRiego: string;
  electricidad: boolean;
  caminoAcceso: boolean;
  cercado: boolean;
  pieCarretera: boolean;
  accesCamiones: boolean;
}

export interface PropertyFilters {
  tipoPropiedad: string;
  subtipo: string[];
  precioMin: string;
  precioMax: string;
  moneda: "MXN" | "USD";
  operacion: "venta" | "renta" | "";
  /** País al que se acota la búsqueda (default: MX). Se persiste en la búsqueda guardada. */
  pais?: CountryCode;
  locationFilter: {
    estado: string;
    ciudad: string;
    municipio: string;
    colonia: string | string[];
  };
  habitaciones: string;
  banos: string;
  estacionamientos: string;
  antiguedad: string;
  niveles: string;
  m2TerrenoMin: string;
  m2ConstruccionMin: string;
  comisionVentaMin: string;
  comisionRentaMin: string;
  polygons: PolygonCoord[][];
  locationChips: LocationChip[];
  comercialFilters: ComercialFilters;
  industrialFilters: IndustrialFilters;
  agricolaFilters: AgricolaFilters;
}

interface PropertyFiltersState {
  filters: PropertyFilters;
  updateFilter: <K extends keyof PropertyFilters>(
    key: K,
    value: PropertyFilters[K],
  ) => void;
  updateLocationFilter: (location: PropertyFilters["locationFilter"]) => void;
  updateComercialFilter: <K extends keyof ComercialFilters>(key: K, value: ComercialFilters[K]) => void;
  updateIndustrialFilter: <K extends keyof IndustrialFilters>(key: K, value: IndustrialFilters[K]) => void;
  updateAgricolaFilter: <K extends keyof AgricolaFilters>(key: K, value: AgricolaFilters[K]) => void;
  // Polygons
  addPolygon: (coords: PolygonCoord[]) => void;
  removePolygon: (index: number) => void;
  clearPolygons: () => void;
  // Location chips
  addLocationChip: (chip: LocationChip) => void;
  removeLocationChip: (id: string) => void;
  clearLocationChips: () => void;
  // General
  clearFilters: (newLocationFilter?: PropertyFilters["locationFilter"]) => void;
  hasActiveFilters: () => boolean;
  /**
   * Carga los filtros de una búsqueda guardada existente en el store.
   * Útil para el flujo de "Editar búsqueda" desde la pantalla de Matches.
   */
  setFiltersFromSearch: (search: busquedas_guardadas) => void;
  pendingOpenMap: boolean;
  setPendingOpenMap: (v: boolean) => void;
}

const initialComercialFilters: ComercialFilters = {
  tipoUbicacion: "",
  frenteMin: "",
  nivel: "",
  sobreAvenidaPrincipal: false,
  enEsquina: false,
  altaVisibilidad: false,
  altoFlujoVehicular: false,
};

const initialIndustrialFilters: IndustrialFilters = {
  ubicacion: "",
  alturaLibre: "",
  energiaKva: [],
  areaOficinasMin: "",
  patioManiobrasMin: "",
};

const initialAgricolaFilters: AgricolaFilters = {
  tiposAgua: [],
  concesionAgua: false,
  usoTerreno: "",
  tipoRiego: "",
  electricidad: false,
  caminoAcceso: false,
  cercado: false,
  pieCarretera: false,
  accesCamiones: false,
};

const initialFilters: PropertyFilters = {
  tipoPropiedad: "",
  subtipo: [],
  precioMin: "",
  precioMax: "",
  moneda: "MXN",
  operacion: "",
  locationFilter: {
    estado: "",
    ciudad: "",
    municipio: "",
    colonia: "",
  },
  habitaciones: "",
  banos: "",
  estacionamientos: "",
  antiguedad: "",
  niveles: "",
  m2TerrenoMin: "",
  m2ConstruccionMin: "",
  comisionVentaMin: "",
  comisionRentaMin: "",
  polygons: [],
  locationChips: [],
  comercialFilters: initialComercialFilters,
  industrialFilters: initialIndustrialFilters,
  agricolaFilters: initialAgricolaFilters,
};

export const usePropertyFiltersStore = create<PropertyFiltersState>(
  (set, get) => ({
    filters: initialFilters,

    updateFilter: (key, value) =>
      set((state) => ({
        filters: { ...state.filters, [key]: value },
      })),

    updateLocationFilter: (location) =>
      set((state) => ({
        filters: { ...state.filters, locationFilter: location },
      })),

    updateComercialFilter: (key, value) =>
      set((state) => ({
        filters: {
          ...state.filters,
          comercialFilters: { ...state.filters.comercialFilters, [key]: value },
        },
      })),

    updateIndustrialFilter: (key, value) =>
      set((state) => ({
        filters: {
          ...state.filters,
          industrialFilters: { ...state.filters.industrialFilters, [key]: value },
        },
      })),

    updateAgricolaFilter: (key, value) =>
      set((state) => ({
        filters: {
          ...state.filters,
          agricolaFilters: { ...state.filters.agricolaFilters, [key]: value },
        },
      })),

    addPolygon: (coords) =>
      set((state) => ({
        filters: {
          ...state.filters,
          polygons: [...state.filters.polygons, coords],
        },
      })),

    removePolygon: (index) =>
      set((state) => ({
        filters: {
          ...state.filters,
          polygons: state.filters.polygons.filter((_, i) => i !== index),
        },
      })),

    clearPolygons: () =>
      set((state) => ({
        filters: { ...state.filters, polygons: [] },
      })),

    addLocationChip: (chip) =>
      set((state) => ({
        filters: {
          ...state.filters,
          locationChips: [...state.filters.locationChips, chip],
        },
      })),

    removeLocationChip: (id) =>
      set((state) => ({
        filters: {
          ...state.filters,
          locationChips: state.filters.locationChips.filter((c) => c.id !== id),
        },
      })),

    clearLocationChips: () =>
      set((state) => ({
        filters: { ...state.filters, locationChips: [] },
      })),

    clearFilters: (newLocationFilter) =>
      set((state) => ({
        filters: {
          ...initialFilters,
          locationFilter: newLocationFilter || state.filters.locationFilter,
        },
      })),

    setFiltersFromSearch: (search) => {
      // Limpiar primero
      set((state) => ({ filters: { ...initialFilters } }));

      // Parsear subtipo (puede venir como array o como JSON string)
      let subtipo: string[] = [];
      if (Array.isArray(search.subtipo)) {
        subtipo = search.subtipo as string[];
      } else if (typeof search.subtipo === "string" && search.subtipo) {
        try {
          const parsed = JSON.parse(search.subtipo);
          subtipo = Array.isArray(parsed) ? parsed : [search.subtipo];
        } catch {
          subtipo = [search.subtipo];
        }
      }

      // Reconstruir locationChips desde criterios_busqueda si existen
      const criterios = (search as any).criterios_busqueda;
      const locationChips: LocationChip[] = [];
      if (criterios?.location_chips && Array.isArray(criterios.location_chips)) {
        criterios.location_chips.forEach((c: any, idx: number) => {
          locationChips.push({
            id: `restored-${idx}`,
            label: c.label,
            type: c.type,
            bounds: c.bounds,
            locationFilter: c.locationFilter || {
              estado: "",
              ciudad: "",
              municipio: "",
              colonia: "",
            },
          });
        });
      }

      // Reconstruir polígonos (polygon_coords en DB puede ser [][] por cómo se guardó)
      const rawPolygons = (search as any).polygon_coords;
      const polygons: PolygonCoord[][] = Array.isArray(rawPolygons)
        ? (rawPolygons as unknown as PolygonCoord[][])
        : [];

      // Filtros especializados
      let comercialFilters = initialComercialFilters;
      let industrialFilters = initialIndustrialFilters;
      let agricolaFilters = initialAgricolaFilters;
      if (criterios?.comercial) comercialFilters = { ...initialComercialFilters, ...criterios.comercial };
      if (criterios?.industrial) industrialFilters = { ...initialIndustrialFilters, ...criterios.industrial };
      if (criterios?.agricola) agricolaFilters = { ...initialAgricolaFilters, ...criterios.agricola };

      set({
        filters: {
          tipoPropiedad: search.tipo_propiedad || "",
          subtipo,
          precioMin: search.precio_min ? String(search.precio_min) : "",
          precioMax: search.precio_max ? String(search.precio_max) : "",
          moneda: (search.moneda as "MXN" | "USD") || "MXN",
          operacion: (search.tipo_operacion as "venta" | "renta" | "") || "",
          locationFilter: {
            estado: (Array.isArray(search.estado) ? (search.estado as string[])[0] : search.estado) || "",
            ciudad: search.ciudad || "",
            municipio: (Array.isArray(search.municipio) ? (search.municipio as string[])[0] : search.municipio) || "",
            colonia: (search as any).colonias
              ? (Array.isArray((search as any).colonias)
                  ? ((search as any).colonias as string[])
                  : [(search as any).colonias as string])
              : search.colonia || "",
          },
          habitaciones: search.habitaciones ? String(search.habitaciones) : "",
          banos: search.banos ? String(search.banos) : "",
          estacionamientos: search.estacionamientos ? String(search.estacionamientos) : "",
          antiguedad: (search as any).antiguedad || criterios?.antiguedad || "",
          niveles: (search as any).pisos ? String((search as any).pisos) : (criterios?.niveles || ""),
          m2TerrenoMin: search.metros_terreno ? String(search.metros_terreno) : "",
          m2ConstruccionMin: search.metros_construccion ? String(search.metros_construccion) : "",
          comisionVentaMin: criterios?.comision_venta_min ? String(criterios.comision_venta_min) : "",
          comisionRentaMin: criterios?.comision_renta_min ? String(criterios.comision_renta_min) : "",
          polygons,
          locationChips,
          comercialFilters,
          industrialFilters,
          agricolaFilters,
        },
      });
    },

    pendingOpenMap: false,
    setPendingOpenMap: (v) => set({ pendingOpenMap: v }),

    hasActiveFilters: () => {
      const { filters } = get();
      const cf = filters.comercialFilters;
      const inf = filters.industrialFilters;
      const ag = filters.agricolaFilters;
      const hasSpecialized =
        cf.tipoUbicacion !== "" || cf.frenteMin !== "" || cf.nivel !== "" ||
        cf.sobreAvenidaPrincipal || cf.enEsquina || cf.altaVisibilidad || cf.altoFlujoVehicular ||
        inf.ubicacion !== "" || inf.alturaLibre !== "" || inf.energiaKva.length > 0 ||
        inf.areaOficinasMin !== "" || inf.patioManiobrasMin !== "" ||
        ag.tiposAgua.length > 0 || ag.concesionAgua || ag.usoTerreno !== "" ||
        ag.tipoRiego !== "" || ag.electricidad || ag.caminoAcceso || ag.cercado ||
        ag.pieCarretera || ag.accesCamiones;
      return (
        filters.polygons.length > 0 ||
        filters.locationChips.length > 0 ||
        filters.tipoPropiedad !== "" ||
        (filters.subtipo && filters.subtipo.length > 0) ||
        filters.precioMin !== "" ||
        filters.precioMax !== "" ||
        filters.habitaciones !== "" ||
        filters.banos !== "" ||
        filters.estacionamientos !== "" ||
        filters.antiguedad !== "" ||
        filters.niveles !== "" ||
        filters.m2TerrenoMin !== "" ||
        filters.m2ConstruccionMin !== "" ||
        filters.operacion !== "" ||
        parseFloat(filters.comisionVentaMin) > 0 ||
        parseFloat(filters.comisionRentaMin) > 0 ||
        hasSpecialized ||
        !!(
          filters.locationFilter.estado ||
          filters.locationFilter.ciudad ||
          filters.locationFilter.municipio ||
          (Array.isArray(filters.locationFilter.colonia)
            ? filters.locationFilter.colonia.length > 0
            : filters.locationFilter.colonia)
        )
      );
    },
  }),
);
