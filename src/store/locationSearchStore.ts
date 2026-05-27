/**
 * locationSearchStore.ts
 * Store Zustand para la búsqueda de zonas geográficas en el mapa.
 * Usa Google Places Autocomplete via locationService.
 */

import { create } from "zustand";
import {
  searchLocations,
  type LocationSuggestion,
} from "../lib/locationService";
import { logger } from "@/utils/logger";

const log = logger.scoped("locationSearchStore");

/** Sugerencia de ubicación enriquecida para mostrar en la UI */
export interface LocationSuggestionWithCount extends LocationSuggestion {
  /** Conteo de propiedades (no calculado en la nueva versión) */
  propertyCount?: number;
  /**
   * Compatibilidad con UI de HomeHeader / useSearch que leen estas propiedades.
   * Se derivan del secondaryText de Google Places.
   */
  municipio_nombre?: string;
  estado_nombre?: string;
  /**
   * @deprecated Era el ID en Supabase Geo. Se mantiene como 0 para compat.
   */
  estado_id?: number;
}

interface LocationSearchState {
  suggestions: LocationSuggestionWithCount[];
  isLoading: boolean;
  /** Token de sesión para agrupar requests de Places API y reducir costos */
  sessionToken: string;
  searchLocations: (searchTerm: string) => Promise<void>;
  clearSuggestions: () => void;
  refreshSessionToken: () => void;
}

function generateToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Parsea el texto secundario de Google para extraer municipio/estado para la UI */
function extractMunicipioEstado(suggestion: LocationSuggestion): {
  municipio_nombre?: string;
  estado_nombre?: string;
} {
  // secondaryText es como "Miguel Hidalgo, CDMX, México" o "Jalisco, México"
  const parts = suggestion.secondaryText
    .replace(/, México$/, "")
    .replace(/, Mexico$/, "")
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);

  if (suggestion.type === "colonia") {
    return {
      municipio_nombre: parts[0],
      estado_nombre: parts[1] ?? parts[0],
    };
  }
  if (suggestion.type === "municipio") {
    return { estado_nombre: parts[0] };
  }
  return {};
}

export const useLocationSearchStore = create<LocationSearchState>((set, get) => ({
  suggestions: [],
  isLoading: false,
  sessionToken: generateToken(),

  clearSuggestions: () => set({ suggestions: [] }),

  refreshSessionToken: () => set({ sessionToken: generateToken() }),

  searchLocations: async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      set({ suggestions: [] });
      return;
    }

    set({ isLoading: true });

    try {
      const { sessionToken } = get();
      const results = await searchLocations(searchTerm, 10, sessionToken);

      const enriched: LocationSuggestionWithCount[] = results.map((loc) => ({
        ...loc,
        ...extractMunicipioEstado(loc),
      }));

      set({ suggestions: enriched });
    } catch (error) {
      log.error("Error fetching location suggestions:", error);
      set({ suggestions: [] });
    } finally {
      set({ isLoading: false });
    }
  },
}));
