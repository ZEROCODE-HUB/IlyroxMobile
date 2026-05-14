import { create } from "zustand";
import { supabaseGeo } from "../lib/supabase-geo";
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
      // 1. Búsqueda de estados y municipios usando search_locations_geo
      const baseLocations = await fetchFromService(searchTerm, 6);
      const filteredBase = baseLocations.filter(
        (loc) => loc.type === "estado" || loc.type === "municipio",
      );

      // Contar propiedades para cada estado/municipio
      const baseCountPromises = filteredBase.map(async (loc) => {
        let query = supabase
          .from("propiedades")
          .select("*", { count: "exact", head: true })
          .eq("activo", true)
          .is("deleted_at", null);
        if (loc.type === "estado") {
          query = query.eq("estado", loc.name);
        } else {
          query = query.eq("municipio", loc.name);
        }
        const { count } = await query;
        return { ...loc, propertyCount: count || 0 } as LocationSuggestionWithCount;
      });

      const baseSuggestions = await Promise.all(baseCountPromises);

      // 2. Búsqueda de colonias con el nuevo RPC que incluye estado y municipio
      const { data: coloniasData, error: coloniasError } =
        await supabaseGeo.rpc("buscar_colonias_con_estado", {
          p_nombre_busqueda: searchTerm,
          p_limit: 12,
        });

      let coloniasSuggestions: LocationSuggestionWithCount[] = [];

      if (!coloniasError && coloniasData && coloniasData.length > 0) {
        // 3. Obtener el conteo de propiedades para cada colonia usando municipio Y estado para precisión
        const countPromises = coloniasData.map(async (c: any) => {
          let query = supabase
            .from("propiedades")
            .select("*", { count: "exact", head: true })
            .eq("colonia", c.nombre)
            .eq("activo", true)
            .is("deleted_at", null);

          // Filtrar también por municipio y estado para diferenciar colonias homónimas
          if (c.municipio_nombre) {
            query = query.eq("municipio", c.municipio_nombre);
          }
          if (c.estado_nombre) {
            query = query.eq("estado", c.estado_nombre);
          }

          const { count } = await query;

          return {
            type: "colonia" as const,
            name: c.nombre,
            estado_id: c.estado_id,
            municipio_nombre: c.municipio_nombre,
            municipio_id: c.municipio_id,
            estado_nombre: c.estado_nombre,
            propertyCount: count || 0,
          };
        });

        const resolvedColonias = await Promise.all(countPromises);

        // Ordenar: primero colonias con más propiedades
        coloniasSuggestions = resolvedColonias.sort(
          (a, b) => (b.propertyCount || 0) - (a.propertyCount || 0)
        );
      } else if (coloniasError) {
        log.warn("[LocationSearch] Error fetching colonias:", coloniasError);
      }

      // Combinar: estados/municipios primero (ordenados por conteo), luego colonias
      const sortedBase = baseSuggestions.sort(
        (a, b) => (b.propertyCount || 0) - (a.propertyCount || 0),
      );
      const combined: LocationSuggestionWithCount[] = [
        ...sortedBase,
        ...coloniasSuggestions,
      ];

      set({ suggestions: combined });
    } catch (error) {
      log.error("Error fetching location suggestions:", error);
      set({ suggestions: [] });
    } finally {
      set({ isLoading: false });
    }
  },
}));
