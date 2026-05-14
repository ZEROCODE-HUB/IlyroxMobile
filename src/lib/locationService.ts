import { supabaseGeo } from "./supabase-geo";
import { logger } from "@/utils/logger";const log = logger.scoped("locationService");

export interface LocationSuggestion {
  type: "estado" | "municipio" | "colonia";
  name: string;
  estado_id?: number;
}

/**
 * Obtiene todas las ubicaciones únicas desde la función RPC de Supabase
 * @returns Array de ubicaciones con tipo (ciudad, municipio, colonia, estado)
 */
export async function getUniqueLocations(): Promise<LocationSuggestion[]> {
  try {
    const { data, error } = await supabaseGeo.rpc("search_locations_geo", {
      p_search: "",
    });

    if (error) throw error;

    return (data || []) as LocationSuggestion[];
  } catch (error) {
    log.error("Error fetching unique locations:", error);
    return [];
  }
}

/**
 * Busca ubicaciones que coincidan con un término de búsqueda
 * @param searchTerm - Término de búsqueda
 * @param limit - Número máximo de resultados (default: 8)
 * @returns Array de ubicaciones filtradas
 */
export async function searchLocations(
  searchTerm: string,
  limit: number = 8,
): Promise<LocationSuggestion[]> {
  try {
    const { data, error } = await supabaseGeo.rpc("search_locations_geo", {
      p_search: searchTerm,
    });

    if (error) throw error;

    return (data || []).slice(0, limit) as LocationSuggestion[];
  } catch (error) {
    log.error("Error fetching searched locations:", error);
    return [];
  }
}
