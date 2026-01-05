import { supabase } from "./supabase";

export interface LocationSuggestion {
  type: "ciudad" | "municipio" | "colonia";
  name: string;
}

/**
 * Obtiene todas las ubicaciones únicas desde la función RPC de Supabase
 * @returns Array de ubicaciones con tipo (ciudad, municipio, colonia)
 */
export async function getUniqueLocations(): Promise<LocationSuggestion[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_unique_locations');

    if (error) throw error;

    return (data || []) as LocationSuggestion[];
  } catch (error) {
    console.error("Error fetching unique locations:", error);
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
  limit: number = 8
): Promise<LocationSuggestion[]> {
  const allLocations = await getUniqueLocations();
  
  if (!searchTerm.trim()) {
    return allLocations.slice(0, limit);
  }

  const filtered = allLocations.filter((location) =>
    location.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return filtered.slice(0, limit);
}