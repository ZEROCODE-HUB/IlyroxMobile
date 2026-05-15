import { create } from "zustand";
import { supabase } from "../lib/supabase";
import {
  searchLocations as fetchFromService,
  LocationSuggestion,
} from "../lib/locationService";
import { logger } from "@/utils/logger";

const log = logger.scoped("locationSearchStore");

export interface LocationSuggestionWithCount extends LocationSuggestion {
  propertyCount?: number;
  municipio_nombre?: string;
  municipio_id?: number;
  estado_nombre?: string;
}

interface LocationSearchState {
  suggestions: LocationSuggestionWithCount[];
  isLoading: boolean;
  searchLocations: (searchTerm: string) => Promise<void>;
  clearSuggestions: () => void;
}

const TYPE_ORDER: Record<LocationSuggestion["type"], number> = {
  estado: 1,
  municipio: 2,
  colonia: 3,
};

export const useLocationSearchStore = create<LocationSearchState>((set) => ({
  suggestions: [],
  isLoading: false,
  clearSuggestions: () => set({ suggestions: [] }),
  searchLocations: async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      set({ suggestions: [] });
      return;
    }

    set({ isLoading: true });

    try {
      // Una sola RPC para los 3 niveles: estados, municipios y colonias
      const allLocations = await fetchFromService(searchTerm, 30);

      // Enriquecer cada sugerencia con su conteo de propiedades, parseando el
      // name compuesto que devuelve search_locations_geo:
      //  - estado:    "Jalisco"
      //  - municipio: "Guadalajara, Jalisco"
      //  - colonia:   "Polanco, Miguel Hidalgo, CDMX"
      const enriched = await Promise.all(
        allLocations.map(async (loc) => {
          if (loc.type === "estado") {
            const { count } = await supabase
              .from("propiedades")
              .select("*", { count: "exact", head: true })
              .eq("estado", loc.name)
              .eq("activo", true)
              .is("deleted_at", null);

            return {
              type: "estado" as const,
              name: loc.name,
              estado_id: loc.estado_id,
              propertyCount: count || 0,
            } satisfies LocationSuggestionWithCount;
          }

          if (loc.type === "municipio") {
            const parts = loc.name.split(", ");
            const municipio = parts[0] ?? loc.name;
            const estado = parts[1];

            let query = supabase
              .from("propiedades")
              .select("*", { count: "exact", head: true })
              .eq("municipio", municipio)
              .eq("activo", true)
              .is("deleted_at", null);
            if (estado) query = query.eq("estado", estado);

            const { count } = await query;

            return {
              type: "municipio" as const,
              name: loc.name,
              estado_id: loc.estado_id,
              estado_nombre: estado,
              propertyCount: count || 0,
            } satisfies LocationSuggestionWithCount;
          }

          // colonia
          const parts = loc.name.split(", ");
          const colonia = parts[0] ?? loc.name;
          const municipio = parts[1];
          const estado = parts[2];

          let query = supabase
            .from("propiedades")
            .select("*", { count: "exact", head: true })
            .eq("colonia", colonia)
            .eq("activo", true)
            .is("deleted_at", null);
          if (municipio) query = query.eq("municipio", municipio);
          if (estado) query = query.eq("estado", estado);

          const { count } = await query;

          return {
            type: "colonia" as const,
            name: colonia,
            estado_id: loc.estado_id,
            municipio_nombre: municipio,
            estado_nombre: estado,
            propertyCount: count || 0,
          } satisfies LocationSuggestionWithCount;
        }),
      );

      // Orden: por tipo (estado → municipio → colonia), luego por conteo desc
      enriched.sort((a, b) => {
        const typeDiff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type];
        if (typeDiff !== 0) return typeDiff;
        return (b.propertyCount || 0) - (a.propertyCount || 0);
      });

      set({ suggestions: enriched });
    } catch (error) {
      log.error("Error fetching location suggestions:", error);
      set({ suggestions: [] });
    } finally {
      set({ isLoading: false });
    }
  },
}));
