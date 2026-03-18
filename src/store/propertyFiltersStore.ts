import { create } from "zustand";

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
}

interface PropertyFiltersState {
  filters: PropertyFilters;
  updateFilter: <K extends keyof PropertyFilters>(
    key: K,
    value: PropertyFilters[K],
  ) => void;
  updateLocationFilter: (location: PropertyFilters["locationFilter"]) => void;
  clearFilters: (newLocationFilter?: PropertyFilters["locationFilter"]) => void;
  hasActiveFilters: () => boolean;
}

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

    clearFilters: (newLocationFilter) =>
      set((state) => ({
        filters: {
          ...initialFilters,
          locationFilter: newLocationFilter || state.filters.locationFilter,
        },
      })),

    hasActiveFilters: () => {
      const { filters } = get();
      return (
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
