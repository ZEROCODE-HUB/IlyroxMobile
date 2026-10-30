import { getCamposVisibles, TipoPrincipal } from "@/constants/propertyData";

/**
 * REV13-01: campos de filtro que el tipo/subtipo elegido NO muestra (p. ej. recamaras en un terreno) pero que pueden
 * quedar guardados de una busqueda anterior. Esos valores ocultos se seguian aplicando y vaciaban los resultados
 * ("Terreno" daba 0). Esta funcion devuelve los mismos filtros con esos campos vacios; si no hay nada que limpiar
 * devuelve el MISMO objeto (sin renders extra). Sin tipo elegido no toca nada.
 */
type FiltrosConTipo = {
  tipoPropiedad: string;
  subtipo: string[];
  habitaciones: string;
  banos: string;
  mediosBanos: string;
  estacionamientos: string;
  antiguedad: string;
  niveles: string;
  m2ConstruccionMin: string;
  m2TerrenoMin: string;
  amenidades: string[];
};

export function sanitizeFiltersByTipo<T extends FiltrosConTipo>(filters: T): T {
  if (!filters || !filters.tipoPropiedad) return filters;
  const cv = getCamposVisibles(
    filters.subtipo ?? [],
    filters.tipoPropiedad as TipoPrincipal,
  );
  // Mismas reglas que SearchFiltersModal: industrial no usa niveles; amenidades solo en habitacional.
  const verNiveles = cv.niveles && filters.tipoPropiedad !== "industrial";
  const verAmenidades = cv.amenidades && filters.tipoPropiedad === "habitacional";

  const patch: Partial<FiltrosConTipo> = {};
  if (!cv.recamaras && filters.habitaciones) patch.habitaciones = "";
  if (!cv.banos && filters.banos) patch.banos = "";
  if (!cv.mediosBanos && filters.mediosBanos) patch.mediosBanos = "";
  if (!cv.estacionamientos && filters.estacionamientos) patch.estacionamientos = "";
  if (!cv.antiguedad && filters.antiguedad) patch.antiguedad = "";
  if (!verNiveles && filters.niveles) patch.niveles = "";
  if (!cv.m2Construccion && filters.m2ConstruccionMin) patch.m2ConstruccionMin = "";
  if (!cv.m2Terreno && filters.m2TerrenoMin) patch.m2TerrenoMin = "";
  if (!verAmenidades && filters.amenidades && filters.amenidades.length > 0) patch.amenidades = [];

  return Object.keys(patch).length > 0 ? { ...filters, ...patch } : filters;
}
