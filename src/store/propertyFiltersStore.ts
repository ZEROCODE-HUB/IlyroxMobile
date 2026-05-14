import { create } from "zustand";

export interface PolygonCoord {
  latitude: number;
  longitude: number;
}

export interface LocationChip {
  id: string;
  label: string;
  type: "estado" | "municipio" | "colonia";
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
