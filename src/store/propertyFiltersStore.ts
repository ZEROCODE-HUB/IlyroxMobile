import { create } from "zustand";
import { GeoBounds, busquedas_guardadas } from "@/types";
import type { CountryCode } from "@/lib/location/types";
import { sanitizeFiltersByTipo } from "@/utils/filterVisibility";

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
  tipoUbicacion: string[];
  frenteMin: string;
  nivel: string;
  sobreAvenidaPrincipal: boolean;
  enEsquina: boolean;
  altaVisibilidad: boolean;
  altoFlujoVehicular: boolean;
}

export interface IndustrialFilters {
  ubicacion: string[];
  alturaLibre: string;
  energiaKva: string[];
  areaOficinasMin: string;
  patioManiobrasMin: string;
}

export interface AgricolaFilters {
  tiposAgua: string[];
  concesionAgua: boolean;
  usoTerreno: string[];
  tipoRiego: string[];
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
  mediosBanos: string;
  estacionamientos: string;
  antiguedad: string;
  niveles: string;
  m2TerrenoMin: string;
  m2ConstruccionMin: string;
  /** Dimensiones mínimas del terreno (frente/fondo). Solo aplican a terrenos. */
  anchoTerrenoMin: string;
  largoTerrenoMin: string;
  comisionVentaMin: string;
  comisionRentaMin: string;
  /** Amenidades seleccionadas; la propiedad debe tenerlas TODAS. */
  amenidades: string[];
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
  /**
   * Actualiza múltiples campos en una sola operación atómica.
   * Útil para evitar renders intermedios cuando un cambio lógico requiere
   * tocar varios campos a la vez (ej. cambiar tipo de propiedad limpia
   * subtipo en el mismo ciclo, evitando un render con estado inconsistente
   * que puede causar crashes en componentes nativos).
   */
  updateFilters: (partial: Partial<PropertyFilters>) => void;
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
  /**
   * Carga filtros desde historial de búsquedas (nueva tabla historial_busquedas).
   * Acepta el objeto filtros_completos directamente.
   */
  setFiltersFromHistory: (historial: { filtros_completos: PropertyFilters; estado?: string | null; ciudad?: string | null; municipio?: string | null; colonia?: string | null; }) => void;
  pendingOpenMap: boolean;
  setPendingOpenMap: (v: boolean) => void;
  /** ID de la búsqueda actual creada desde SearchOverlay (para reutilizar en MapSearch) */
  currentSearchId: string | null;
  setCurrentSearchId: (id: string | null) => void;
}

export const initialComercialFilters: ComercialFilters = {
  tipoUbicacion: [],
  frenteMin: "",
  nivel: "",
  sobreAvenidaPrincipal: false,
  enEsquina: false,
  altaVisibilidad: false,
  altoFlujoVehicular: false,
};

export const initialIndustrialFilters: IndustrialFilters = {
  ubicacion: [],
  alturaLibre: "",
  energiaKva: [],
  areaOficinasMin: "",
  patioManiobrasMin: "",
};

export const initialAgricolaFilters: AgricolaFilters = {
  tiposAgua: [],
  concesionAgua: false,
  usoTerreno: [],
  tipoRiego: [],
  electricidad: false,
  caminoAcceso: false,
  cercado: false,
  pieCarretera: false,
  accesCamiones: false,
};

/**
 * Máximo de chips de ubicación que se pueden acumular.
 * Más allá de este límite, el rendimiento del filtrado cliente
 * y la legibilidad de la UI se degradan. El usuario puede quitar
 * chips con la X para liberar espacio.
 */
export const MAX_LOCATION_CHIPS = 5;

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
  mediosBanos: "",
  estacionamientos: "",
  antiguedad: "",
  niveles: "",
  m2TerrenoMin: "",
  m2ConstruccionMin: "",
  anchoTerrenoMin: "",
  largoTerrenoMin: "",
  comisionVentaMin: "",
  comisionRentaMin: "",
  amenidades: [],
  polygons: [],
  locationChips: [],
  comercialFilters: initialComercialFilters,
  industrialFilters: initialIndustrialFilters,
  agricolaFilters: initialAgricolaFilters,
};

export const usePropertyFiltersStore = create<PropertyFiltersState>(
  (set, get) => ({
    filters: initialFilters,

    // REV13-01: al cambiar tipo/subtipo se vacian los campos que ya no aplican (ver utils/filterVisibility.ts).
    updateFilter: (key, value) =>
      set((state) => ({
        filters: sanitizeFiltersByTipo({ ...state.filters, [key]: value } as PropertyFilters),
      })),

    updateFilters: (partial) =>
      set((state) => ({
        filters: sanitizeFiltersByTipo({ ...state.filters, ...partial } as PropertyFilters),
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
      set((state) => {
        // REV05-29: una zona ya agregada no se duplica. Se compara tipo + nombre
        // + municipio + estado (sin acentos ni mayusculas) y NO el id: el mismo
        // lugar llega con ids distintos desde la lupa del mapa, el historial y
        // el buscador del feed. Dos zonas con el mismo nombre pero de distinto
        // municipio o estado (p. ej. "Centro") siguen siendo chips distintos.
        const chipKey = (c: LocationChip) =>
          [
            c.type,
            c.label,
            c.locationFilter?.municipio ?? "",
            c.locationFilter?.estado ?? "",
          ]
            .map((v) =>
              String(v ?? "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim()
                .toLowerCase(),
            )
            .join("|");
        if (state.filters.locationChips.some((c) => chipKey(c) === chipKey(chip))) {
          return state;
        }
        // Límite máximo de chips acumulados. Esto evita que el cliente filtre
        // demasiadas zonas a la vez (rendimiento) y mantiene la búsqueda
        // acotada. El usuario debe quitar un chip (con la X) para agregar otro.
        if (state.filters.locationChips.length >= MAX_LOCATION_CHIPS) {
          console.log("[DEBUG addLocationChip] BLOQUEADO: límite de chips alcanzado", {
            current: state.filters.locationChips.length,
            max: MAX_LOCATION_CHIPS,
          });
          return state;
        }
        // DEBUG: log para diagnosticar acumulación de chips
        const prevChipsCount = state.filters.locationChips.length;
        const prevLocationFilter = { ...state.filters.locationFilter };
        const next = {
          filters: {
            ...state.filters,
            locationChips: [...state.filters.locationChips, chip],
            // FIX: poblar locationFilter con los datos del chip para que
            // matchesLocationFilter() siga funcionando y el historial de
            // búsquedas se guarde completo (sin esto, el locationFilter
            // quedaba vacío y al restaurar desde historial se filtraba
            // con criterios incorrectos).
            locationFilter: {
              estado: chip.locationFilter.estado || state.filters.locationFilter.estado,
              ciudad: chip.locationFilter.ciudad || state.filters.locationFilter.ciudad,
              municipio: chip.locationFilter.municipio || state.filters.locationFilter.municipio,
              colonia: chip.locationFilter.colonia || state.filters.locationFilter.colonia,
            },
          },
        };
        console.log("[DEBUG addLocationChip]", {
          prevChipsCount,
          prevChips: state.filters.locationChips.map(c => ({ id: c.id, label: c.label })),
          newChip: { id: chip.id, label: chip.label, type: chip.type },
          newChipsCount: next.filters.locationChips.length,
          prevLocationFilter,
          newLocationFilter: next.filters.locationFilter,
        });
        return next;
      }),

    removeLocationChip: (id) =>
      set((state) => {
        const locationChips = state.filters.locationChips.filter((c) => c.id !== id);
        const noChipsLeft = locationChips.length === 0;
        return {
          filters: {
            ...state.filters,
            locationChips,
            locationFilter: noChipsLeft
              ? initialFilters.locationFilter
              : state.filters.locationFilter,
            // Los polígonos dibujados se conservan: quitar la última ubicación
            // con nombre (p. ej. "Aguascalientes") debe dejar la búsqueda solo
            // por la zona dibujada, no borrarla. Para limpiar zonas está
            // clearPolygons.
          },
        };
      }),

    clearLocationChips: () =>
      set((state) => ({
        filters: { ...state.filters, locationChips: [], polygons: [] },
      })),

    clearFilters: (newLocationFilter) =>
      set((state) => ({
        filters: {
          ...initialFilters,
          locationFilter: newLocationFilter ?? initialFilters.locationFilter,
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
      if (criterios?.comercial) {
        comercialFilters = { ...initialComercialFilters, ...criterios.comercial };
        // tipoUbicacion puede venir como string (guardado legacy) o como array
        const tu = (criterios.comercial as any).tipoUbicacion;
        comercialFilters.tipoUbicacion = Array.isArray(tu) ? tu : tu ? [tu] : [];
      }
      if (criterios?.industrial) {
        industrialFilters = { ...initialIndustrialFilters, ...criterios.industrial };
        // ubicacion puede venir como string (guardado legacy) o como array
        const _u = (criterios.industrial as any).ubicacion;
        industrialFilters.ubicacion = Array.isArray(_u) ? _u : _u ? [_u] : [];
      }
      if (criterios?.agricola) {
        agricolaFilters = { ...initialAgricolaFilters, ...criterios.agricola };
        // usoTerreno/tipoRiego pueden venir como string (legacy) o como array
        const _ut = (criterios.agricola as any).usoTerreno;
        const _tr = (criterios.agricola as any).tipoRiego;
        agricolaFilters.usoTerreno = Array.isArray(_ut) ? _ut : _ut ? [_ut] : [];
        agricolaFilters.tipoRiego = Array.isArray(_tr) ? _tr : _tr ? [_tr] : [];
      }

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
          mediosBanos: (search as any).medios_banos
            ? String((search as any).medios_banos)
            : (criterios?.medios_banos ? String(criterios.medios_banos) : ""),
          estacionamientos: search.estacionamientos ? String(search.estacionamientos) : "",
          antiguedad: String((search as any).antiguedad || criterios?.antiguedad || ""),
          // `criterios.niveles` guarda el valor tal cual se eligió ("3+", "Más…");
          // la columna `pisos` es solo el entero y, si se usaba primero, "3+"
          // volvía como "3" y el filtro pasaba de mínimo a exacto.
          niveles: criterios?.niveles
            ? String(criterios.niveles)
            : ((search as any).pisos ? String((search as any).pisos) : ""),
          m2TerrenoMin: search.metros_terreno ? String(search.metros_terreno) : "",
          m2ConstruccionMin: search.metros_construccion ? String(search.metros_construccion) : "",
          anchoTerrenoMin: criterios?.ancho_terreno_min ? String(criterios.ancho_terreno_min) : "",
          largoTerrenoMin: criterios?.largo_terreno_min ? String(criterios.largo_terreno_min) : "",
          comisionVentaMin: criterios?.comision_venta_min ? String(criterios.comision_venta_min) : "",
          comisionRentaMin: criterios?.comision_renta_min ? String(criterios.comision_renta_min) : "",
          amenidades: Array.isArray(criterios?.amenidades) ? criterios.amenidades : [],
          polygons,
          locationChips,
          comercialFilters,
          industrialFilters,
          agricolaFilters,
        },
      });
    },

    /**
     * Carga filtros desde historial de búsquedas (nueva tabla historial_busquedas).
     * Acepta el objeto filtros_completos directamente (PropertyFilters).
     */
    setFiltersFromHistory: (historial: { filtros_completos: PropertyFilters; estado?: string | null; ciudad?: string | null; municipio?: string | null; colonia?: string | null; }) => {
      if (!historial.filtros_completos) return;
      
      const filtros = historial.filtros_completos;
      
      set({
        filters: {
          ...initialFilters,
          ...filtros,
          // Asegurar que locationFilter tenga la estructura correcta
          locationFilter: {
            ...initialFilters.locationFilter,
            ...(filtros.locationFilter || {}),
            // Override con valores de ubicación si existen
            estado: filtros.locationFilter?.estado || historial.estado || '',
            ciudad: filtros.locationFilter?.ciudad || historial.ciudad || '',
            municipio: filtros.locationFilter?.municipio || historial.municipio || '',
            colonia: filtros.locationFilter?.colonia || historial.colonia || '',
          },
        },
      });
    },

    pendingOpenMap: false,
    setPendingOpenMap: (v) => set({ pendingOpenMap: v }),

    currentSearchId: null,
    setCurrentSearchId: (id) => set({ currentSearchId: id }),

    hasActiveFilters: () => {
      const { filters } = get();
      const cf = filters.comercialFilters;
      const inf = filters.industrialFilters;
      const ag = filters.agricolaFilters;
      const hasSpecialized =
        cf.tipoUbicacion.length > 0 || cf.frenteMin !== "" || cf.nivel !== "" ||
        cf.sobreAvenidaPrincipal || cf.enEsquina || cf.altaVisibilidad || cf.altoFlujoVehicular ||
        inf.ubicacion.length > 0 || inf.alturaLibre !== "" || inf.energiaKva.length > 0 ||
        inf.areaOficinasMin !== "" || inf.patioManiobrasMin !== "" ||
        ag.tiposAgua.length > 0 || ag.concesionAgua || ag.usoTerreno.length > 0 ||
        ag.tipoRiego.length > 0 || ag.electricidad || ag.caminoAcceso || ag.cercado ||
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
        filters.mediosBanos !== "" ||
        filters.estacionamientos !== "" ||
        filters.antiguedad !== "" ||
        filters.niveles !== "" ||
        filters.m2TerrenoMin !== "" ||
        filters.m2ConstruccionMin !== "" ||
        filters.anchoTerrenoMin !== "" ||
        filters.largoTerrenoMin !== "" ||
        filters.operacion !== "" ||
        parseFloat(filters.comisionVentaMin) > 0 ||
        parseFloat(filters.comisionRentaMin) > 0 ||
        filters.amenidades.length > 0 ||
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
