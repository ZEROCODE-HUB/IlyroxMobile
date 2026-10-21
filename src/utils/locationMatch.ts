/**
 * Regla de ubicación compartida entre el mapa y el matching de búsquedas.
 *
 * El matching del servidor (`evaluar_par_match` en Supabase) decide si una
 * propiedad coincide con una búsqueda guardada. El mapa tiene que aplicar la
 * MISMA regla; si no, el usuario ve en el mapa propiedades que después nunca le
 * llegan como match (o al revés). Este archivo replica esa regla en el cliente.
 *
 * Si cambia `evaluar_par_match` (o `normalizar_ubicacion`) hay que cambiar esto
 * también. Respaldo de la versión replicada: supabase/backups/2026-10-19-prod/.
 */
import type { LocationChip, PropertyFilters } from "@/store/propertyFiltersStore";

/** Réplica de la función SQL `normalizar_ubicacion`. */
export function normalizarUbicacion(t?: string | null): string {
  if (t == null) return "";
  const n = t
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  // REV05-06: ademas de minusculas y sin acentos, cualquier signo o puntuacion
  // cuenta como espacio ("ST. ANGELO RESIDENCE" == "St Angelo Residence").
  // Misma regla que normalizar_texto_ubicacion() en la BD.
  const s = n.replace(/[^a-z0-9]+/g, " ").trim();
  switch (s) {
    case "ciudad de mexico":
    case "ciudad de mexico cdmx":
    case "distrito federal":
    case "mexico city":
      return "cdmx";
    case "edomex":
    case "mexico":
      return "estado de mexico";
    case "coahuila de zaragoza":
      return "coahuila";
    case "michoacan de ocampo":
      return "michoacan";
    case "veracruz de ignacio de la llave":
    case "veracruz llave":
      return "veracruz";
    default:
      return s;
  }
}

/** Criterios de ubicación tal como se guardan en `busquedas_guardadas`. */
export interface LocationCriteria {
  estado: string[];
  municipio: string[];
  colonias: string[];
  ciudad: string;
}

const uniqueNonEmpty = (values: (string | undefined | null)[]): string[] => [
  ...new Set(values.filter((v): v is string => !!v && !!v.trim())),
];

/**
 * Arma los criterios de ubicación a partir de los filtros del mapa, igual que
 * se guardan en la búsqueda: lo del filtro base manda; si no hay, se toma de los
 * chips. Ojo: los chips se aplanan por campo, así que mezclar niveles (p. ej. un
 * chip de colonia y otro de municipio) exige que la propiedad cumpla todos.
 */
export function buildLocationCriteria(
  locationFilter: PropertyFilters["locationFilter"],
  chips: LocationChip[],
): LocationCriteria {
  const lf = locationFilter;
  const chipValues = (key: "estado" | "municipio" | "colonia") =>
    uniqueNonEmpty(chips.map((c) => c.locationFilter?.[key] as string | undefined));

  // Con chips, los CHIPS son la fuente de verdad. El filtro base es una copia
  // del ULTIMO chip agregado (propertyFiltersStore.addLocationChip) y antes
  // mandaba sobre todos los demas: con varias zonas solo se filtraba por la
  // ultima y al quitar un chip el base quedaba desactualizado (REV05-39).
  if (chips.length > 0) {
    return {
      estado: chipValues("estado"),
      municipio: chipValues("municipio"),
      colonias: chipValues("colonia"),
      ciudad: chips.map((c) => c.locationFilter?.ciudad).find((v) => !!v) || "",
    };
  }

  const baseColonias = Array.isArray(lf.colonia) ? lf.colonia : lf.colonia ? [lf.colonia] : [];

  return {
    estado: lf.estado ? [lf.estado] : chipValues("estado"),
    municipio: lf.municipio ? [lf.municipio] : chipValues("municipio"),
    colonias: baseColonias.length > 0 ? uniqueNonEmpty(baseColonias) : chipValues("colonia"),
    ciudad: lf.ciudad || "",
  };
}

/**
 * Criterios de UN solo chip (su estado, municipio y colonia). Sirve para evaluar
 * cada chip como un par independiente y unir los chips con "o" (REV05-39).
 */
export function criteriaFromChip(chip: LocationChip): LocationCriteria {
  const lf = chip.locationFilter;
  const colonia = lf?.colonia as string | string[] | undefined;
  return {
    estado: lf?.estado ? [lf.estado] : [],
    municipio: lf?.municipio ? [lf.municipio] : [],
    colonias: Array.isArray(colonia)
      ? colonia.filter((c) => !!c && !!c.trim())
      : colonia
        ? [colonia]
        : [],
    ciudad: lf?.ciudad || "",
  };
}

export function hasLocationCriteria(c: LocationCriteria): boolean {
  return c.estado.length > 0 || c.municipio.length > 0 || c.colonias.length > 0 || !!c.ciudad.trim();
}

/**
 * ¿La propiedad cumple los criterios de ubicación por texto? Misma regla que
 * `evaluar_par_match` cuando no hay polígono:
 *  - Solo estado → el estado de la propiedad contiene alguno de los buscados.
 *  - Con municipio, colonia o ciudad → el texto es necesario y suficiente:
 *    cada criterio presente debe coincidir exacto (normalizado). Los bounds de
 *    Google ya no rescatan propiedades de otro municipio que caigan en el
 *    recuadro (p. ej. Jesús María dentro del de Aguascalientes).
 */
export function matchesLocationCriteria(
  prop: { estado?: string | null; municipio?: string | null; colonia?: string | null; ciudad?: string | null },
  c: LocationCriteria,
): boolean {
  const pEstado = normalizarUbicacion(prop.estado);
  // El SQL usa LIKE '%estado%' para el estado; con los datos actuales equivale
  // a la igualdad, pero se replica tal cual.
  if (c.estado.length > 0 && !c.estado.some((e) => pEstado.includes(normalizarUbicacion(e)))) {
    return false;
  }
  if (c.ciudad.trim() && normalizarUbicacion(prop.ciudad) !== normalizarUbicacion(c.ciudad)) {
    return false;
  }
  // REV05-24: con colonia, el municipio que da Google puede no ser el de la BD
  // (Google ubica St Angelo en Aguascalientes y la BD en Jesus Maria). La colonia y
  // el estado bastan. Mismo criterio en evaluar_par_match (SQL 07).
  if (c.municipio.length > 0 && c.colonias.length === 0) {
    const pMunicipio = normalizarUbicacion(prop.municipio);
    if (!c.municipio.some((m) => normalizarUbicacion(m) === pMunicipio)) return false;
  }
  if (c.colonias.length > 0) {
    const pColonia = normalizarUbicacion(prop.colonia);
    if (!c.colonias.some((col) => normalizarUbicacion(col) === pColonia)) return false;
  }
  return true;
}
