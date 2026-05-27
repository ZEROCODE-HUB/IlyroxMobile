/**
 * locationService.ts
 * Búsqueda de zonas geográficas via Google Places Autocomplete API.
 * Reemplaza la dependencia de Supabase Geo (search_locations_geo RPC).
 */

import {
  searchPlaces,
  getPlaceDetails,
  derivePlaceType,
  type GeoBounds,
} from "./geocodingService";

export interface LocationSuggestion {
  placeId: string;
  name: string;             // Nombre principal (ej: "Polanco", "Guadalajara")
  secondaryText: string;    // Contexto (ej: "Miguel Hidalgo, CDMX")
  fullDescription: string;  // Descripción completa (ej: "Polanco, Miguel Hidalgo, CDMX, México")
  type: "estado" | "municipio" | "colonia";
}

/**
 * Busca ubicaciones que coincidan con un término de búsqueda.
 * Usa Google Places Autocomplete con restricción a México.
 *
 * @param searchTerm  Texto a buscar (ej. "Polanco", "Guadalajara", "Jalisco")
 * @param limit       Número máximo de resultados (default: 8)
 * @param sessionToken Token de sesión para agrupar llamadas de autocompletado
 */
export async function searchLocations(
  searchTerm: string,
  limit: number = 8,
  sessionToken?: string,
): Promise<LocationSuggestion[]> {
  if (!searchTerm.trim()) return [];

  try {
    const predictions = await searchPlaces(searchTerm, sessionToken);
    return predictions.slice(0, limit).map((p) => ({
      placeId: p.placeId,
      name: p.mainText,
      secondaryText: p.secondaryText,
      fullDescription: p.description,
      type: derivePlaceType(p.types),
    }));
  } catch (e) {
    console.warn("[locationService] searchLocations error:", e);
    return [];
  }
}

/**
 * Obtiene los bounds geográficos de una sugerencia de lugar.
 * Llama a Place Details API con el placeId.
 *
 * @param placeId      ID de Google Places obtenido de searchLocations
 * @param sessionToken Token de sesión (debe coincidir con el de searchLocations)
 */
export async function getLocationBounds(
  placeId: string,
  sessionToken?: string,
): Promise<GeoBounds | null> {
  const details = await getPlaceDetails(placeId, sessionToken);
  return details?.bounds ?? null;
}

// Re-exportar GeoBounds para conveniencia
export type { GeoBounds };
