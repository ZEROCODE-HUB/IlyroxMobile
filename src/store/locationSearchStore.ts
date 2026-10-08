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
import { getCountryConfig, DEFAULT_COUNTRY } from "../lib/location/registry";
import type { CountryCode } from "../lib/location/types";
import { supabase } from "../lib/supabase";
import { logger } from "@/utils/logger";

const log = logger.scoped("locationSearchStore");

/**
 * Tipos de Google Places que se consideran RUIDO y se filtran.
 * Son tipos de establecimientos, calles y POIs que no son zonas geográficas
 * relevantes para bienes raíces (colonias, fraccionamientos, municipios, estados).
 */
const NOISE_TYPES = new Set([
  "route",                    // Calles y avenidas (ej: "Av. del Valle")
  "establishment",            // Negocios genéricos (ej: "Loreta café")
  "point_of_interest",       // Puntos de interés
  "store",                   // Tiendas
  "cafe",                    // Cafés/restaurantes
  "food",                    // Lugares de comida
  "lodging",                 // Hoteles
  "bank",                    // Bancos
  "church",                  // Iglesias
  "hindu_temple",            // Templos
  "mosque",                  // Mezquitas
  "synagogue",              // Sinagogas
  "city_hall",               // Ayuntamientos
  "courthouse",              // Juzgados
  "hospital",                // Hospitales
  "doctor",                  // Doctores
  "pharmacy",                // Farmacias
  "gas_station",             // Gasolineras
  "parking",                 // Estacionamientos
  "school",                  // Escuelas
  "university",              // Universidades
  "gym",                     // Gimnasios
  "shopping_mall",           // Centros comerciales
  "supermarket",             // Supermercados
  "movie_theater",           // Cine
  "museum",                  // Museos
  "zoo",                     // Zoológicos
  "airport",                 // Aeropuertos
  "train_station",           // Estaciones de tren
  "bus_station",             // Estaciones de autobús
  "car_rental",              // Rentadoras de auto
  "car_repair",              // Talleres mecánicos
  "laundry",                 // Lavanderías
  "beauty_salon",            // Salones de belleza
  "hair_care",               // Peluquerías
  "insurance_agency",         // Agencias de seguros
  "real_estate_agency",      // Agencias inmobiliarias (puede generar ruido)
  "travel_agency",           // Agencias de viaje
  "library",                 // Bibliotecas
  "stadium",                 // Estadios
  "amusement_park",          // Parques de diversiones
  "aquarium",                // Acuarios
  "casino",                  // Casinos
  "night_club",              // Clubs nocturnos
  "bar",                     // Bares
  "bowling_alley",           // Boliches
  "art_gallery",             // Galerías de arte
  "zoo_entrance",            // Entradas de zoológico
]);

/**
 * Palabras clave que indican que un lugar es una zona residencial/fraccionamiento
 * y NO debe filtrarse aunque tenga tipos como "establishment" o "point_of_interest".
 * Google no clasifica bien los fraccionamientos en México, los marca como
 * establecimientos, así que filtramos por nombre.
 *
 * Fuentes: Google Places API types para Housing (apartment_building, apartment_complex,
 * condominium_complex, housing_complex) y desarrollos residenciales comunes en México.
 */
const RESIDENTIAL_KEYWORDS = [
  // === ABREVIATURAS Y VARIANTES ===
  "fracc",        // Fracc., Fraccionamiento
  "frac.",        // Frac. (abreviatura)
  "res.",         // Res. (abreviatura)
  "cond.",        // Cond. (abreviatura)

  // === TIPOS DE DESARROLLOS RESIDENCIALES ===
  "fraccionamiento",
  "residencial",
  "condominio",
  "coto",
  "conjunto habitacional",
  "conjunto",
  "casa club",
  "habitacional",
  "privada",       // Fraccionamiento privado
  "paraje",         // Paraje/Parajo (zonas semi-rurales en México)
  "barrio",
  "villa",
  "lote",           // Lotes residenciales
  "lotes",
  "ampliacion",     // Ampliaciones (común en México)

  // === NOMBRES COMUNES EN FRACCIONAMIENTOS ===
  // Naturales
  "valle",          // Fracc. El Valle, Valle Real
  "lomas",          // Las Lomas
  "bosques",        // Bosques
  "arboledas",
  "palmas",
  "cipreses",
  "flores",
  "rosales",
  "jardines",
  "monte",
  "prados",
  "fuentes",
  "rios",           // Residenciales cerca de ríos
  "lagos",
  "mirador",        // Vista

  // Ingleses (comunes en México)
  "garden",
  "park",
  "view",           // Vista
  "vista",
  "hills",
  "heights",
  "green",
  "place",
  "square",
  "terrace",
  "residence",

  // === PATRONES FRECUENTES EN NOMBRES ===
  // "Las + naturaleza"
  "las lomas",
  "las flores",
  "las palmas",
  "las cipreses",
  // "San/Santa + nombre"
  "san angel",
  "santa fe",
  "santa maria",
  // "El + nombre"
  "el valle",
  "el palomar",
  "el encantado",
  // Otros
  "hacienda",       // Comunidades cerradas tipo hacienda
  "puerto",         // Puertos residenciales
  "boutique",       // Residenciales tipo boutique
  "paseo",          // Paseos residenciales
  "andares",
  "boulevard",
  "centro",

  // === NOMBRES DE DESARROLLOS RESIDENCIALES COMUNES EN MÉXICO ===
  // Nombres con "Premier", "Cumbres", etc.
  "premier",        // San Nicolás Premier, Cumbres Elite Premier
  "cumbres",        // Cumbres, Valle de Cumbres
  "elite",          // Cumbres Elite
  "santuario",      // Santuario Residencial
  "torres",         // Torres residenciales
  "parque",         // Parque Residencial
  "alameda",        // Alameda

  // === FLORES Y PLANTAS EN NOMBRES ===
  "bugambilias",
  "girasoles",
  "lavanda",
  "magnolia",
  "naranjos",
  "limones",
  "nogales",
  "encinos",
  "madreselva",
  "dalias",
  "claveles",
  "orquideas",
  "tulipanes",
  "violetas",
  "margaritas",
  "geranios",
  "lavanda",

  // === GEOGRAFICOS ===
  "colina",         // Colina/Colinas
  "colinas",
  "montaña",
  "cerro",
  "cumbre",
  "cumbres",
  "valles",
  "loma",           // Loma/Lomas

  // === INGLESES COMUNES EN MÉXICO ===
  "sunset",
  "sunrise",
  "bay",
  "ocean",
  "sky",
  "harbor",
  "harbour",
  "lake",
  "country club",

  // === OTROS TERMINOS RESIDENCIALES ===
  "europa",         // Residencial Europa
  "america",         // Residencial América
  "mexico",         // Residencial México
  "regio",          // Regio
  "noroeste",
  "sureste",
  "suroeste",
  "noreste",
  "norte",
  "sur",
  "oriente",
  "poniente",
  "real",           // Fracc. El Real, Valle Real
  "vistas",         // Las Vistas
  "coto",
  "jaiber",
  "siguiente",
  "alameda",
  "reforma",
  "madero",
  "zaragoza",
  "independencia",
  "revolucion",

  // === ZONAS ESPECIFICAS DE AGUASCALIENTES Y ZONA METROPOLITANA ===
  "aguascalientes",
  "jesus maria",
  "calvillo",
  "pabellon",
  "rincon",
  "san cayetano",
  "san marcos",
  "san jose",
  "san francisco",
  "san rafael",
  "san miguel",
  "san juan",
  "san pedro",
  "san sebastian",
  "18 de marzo",
  "circuito",
  "tecon",
  "megaclick",
  "oradel",
  "hidrocuitz",
];

/**
 * Lista de nombres CONCRETOS que SIEMPRE deben mostrarse, aunque Google los
 * clasifique con tipos de ruido (route, establishment, point_of_interest...).
 *
 * Sirve para fraccionamientos o zonas conocidas que Google etiqueta mal (por
 * ejemplo "Loretta II", que Google devuelve como type "route" y por eso se
 * confundía con una avenida y se descartaba).
 *
 * IMPORTANTE: es una lista curada a propósito. Agrega aquí SOLO lugares reales
 * confirmados; NO uses palabras genéricas, porque eso volvería a colar ruido.
 */
const ALLOWED_PLACES = [
  "loretta ii",
  "reserva couvet",
  "reserva san nicolas",
];

/**
 * Lista negra de nombres de lugares que NUNCA deben mostrarse en las sugerencias.
 * Estos son puntos de interés, aeropuertos, terminales, etc. que no son zonas
 * inmobiliarias relevantes aunque Google los devuelva.
 *
 * IMPORTANTE: usa nombres normalizados (minúsculas, sin acentos). Se compara
 * como substring del nombre.
 */
const PLACE_BLACKLIST = [
  "international airport",
  "aeropuerto internacional",
  "bus station",
  "estacion de autobuses",
  "central de autobuses",
  "transit station",
  "casa club",
  "fisioterapia",
  "consultorio",
  "clinica",
  "hospital",
  "laboratorio",
  "pharmacy",
  "farmacia",
  "doctor",
  "clinica dental",
  "dentista",
  "dental",
  "dentist",
  "clinica dental",
  "medical",
  "laboratorio clinique",
  "sure smile",
  "funeraria",
  "funerarias",
  "capillas funerarias",
  "premier english",
  "english school",
  "academia",
  "escuela de ingles",
  "colegio",
  "preparatoria",
  "universidad",
  " kinder",
  "guarderia",
  "salon de fiestas",
  "salon de eventos",
  "banquetes",
];

/**
 * Verifica si el nombre indica que es una zona residencial/fraccionamiento.
 */
function isResidentialArea(name: string): boolean {
  const lower = name.toLowerCase();
  return RESIDENTIAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Verifica si el nombre corresponde a un lugar de la lista de permitidos.
 * Los permitidos nunca se filtran como ruido.
 */
function isAllowedPlace(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_PLACES.some((p) => lower.includes(p));
}

/**
 * Verifica si el nombre está en la lista negra.
 */
function isBlacklistedPlace(name: string): boolean {
  const lower = name.toLowerCase();
  return PLACE_BLACKLIST.some((b) => lower.includes(b));
}

/**
 * Verifica si una sugerencia de Google Places es "ruido" (establecimiento, calle, POI).
 * Retorna true si es ruido y debe filtrarse.
 */
function isNoiseSuggestion(types: string[] | undefined, name: string): boolean {
  // Los lugares de la lista negra SIEMPRE se filtran (override)
  if (isBlacklistedPlace(name)) return true;
  // Los lugares de la lista de permitidos NUNCA son ruido
  if (isAllowedPlace(name)) return false;
  // Las zonas residenciales/fraccionamientos NO son ruido aunque Google
  // los marque como establishment o point_of_interest
  if (isResidentialArea(name)) return false;
  if (!types || types.length === 0) return false;
  // Si AL MENOS UNO de los types es ruido, se filtra
  return types.some((t) => NOISE_TYPES.has(t));
}

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
  /** Contador de requests para descartar respuestas obsoletas */
  latestSearchRequestId: number;
  searchLocations: (
    searchTerm: string,
    country?: CountryCode,
    opts?: { restrictToRegions?: boolean; withCounts?: boolean; estado?: string },
  ) => Promise<void>;
  clearSuggestions: () => void;
  refreshSessionToken: () => void;
}

function generateToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Parsea el texto secundario de Google para extraer los dos niveles superiores
 * (nivel 2 = municipio, nivel 1 = estado) para la UI, según el país.
 */
function extractMunicipioEstado(
  suggestion: LocationSuggestion,
  country: CountryCode = DEFAULT_COUNTRY,
): {
  municipio_nombre?: string;
  estado_nombre?: string;
} {
  // secondaryText puede tener un número variable de segmentos, p. ej.:
  //   "Miguel Hidalgo, Ciudad de México, México"            → [municipio, estado]
  //   "Polanco, Miguel Hidalgo, Ciudad de México, México"   → [colonia, municipio, estado]
  //   "Jalisco, México"                                      → [estado]
  // Criterio robusto (igual que el fallback de CascadeLocationSelector):
  // el estado es SIEMPRE el último componente y el municipio el penúltimo.
  const config = getCountryConfig(country);
  let secondary = suggestion.secondaryText.trim();
  // Quitar el sufijo del país al final (", México", ", Mexico", ...).
  for (const suffix of config.countrySuffixes) {
    secondary = secondary.replace(
      new RegExp(`,\\s*${suffix}\\s*$`, "i"),
      "",
    );
  }
  const parts = secondary
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return {};

  // Para un nivel 1 (estado), el `name` ya es ese nivel: no se necesita subtítulo.
  if (suggestion.type === "estado") return {};

  const estado_nombre = parts[parts.length - 1];

  if (suggestion.type === "municipio") {
    const municipio_nombre =
      parts.length >= 2 ? parts[parts.length - 2] : undefined;
    return { municipio_nombre, estado_nombre: normalizeStateAbbrev(estado_nombre, config) };
  }

  // colonia (nivel 3)
  const municipio_nombre =
    parts.length >= 2 ? parts[parts.length - 2] : undefined;
  return { municipio_nombre, estado_nombre: normalizeStateAbbrev(estado_nombre, config) };
}

/**
 * Resuelve abreviaturas de estado que Google agrega en `secondary_text` cuando
 * el municipio comparte nombre con su estado (ej. "Aguascalientes, Ags.,
 * México" en vez de repetir "Aguascalientes"). Sin esto, `estado_nombre`
 * queda como "Ags." literal y nunca matchea contra `effectiveEstado`
 * ("Aguascalientes"), así que el re-rank geográfico descarta el resultado
 * como "no local" — justo el caso donde el municipio y el estado son el mismo
 * nombre, es decir, la capital del estado, que suele ser lo más buscado.
 */
function normalizeStateAbbrev(
  value: string,
  config: ReturnType<typeof getCountryConfig>,
): string {
  const map = config.stateAbbreviations;
  if (!map) return value;
  const key = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.$/, "")
    .trim();
  return map[key] ?? value;
}

export const useLocationSearchStore = create<LocationSearchState>((set, get) => ({
  suggestions: [],
  isLoading: false,
  sessionToken: generateToken(),
  latestSearchRequestId: 0,

  clearSuggestions: () => set({ suggestions: [] }),

  refreshSessionToken: () => set({ sessionToken: generateToken() }),

  searchLocations: async (
    searchTerm: string,
    country: CountryCode = DEFAULT_COUNTRY,
    opts?: { restrictToRegions?: boolean; withCounts?: boolean; estado?: string },
  ) => {
    // Se toma ANTES de cualquier await: una búsqueda nueva deja obsoleta a la
    // anterior en el acto (aunque su respuesta llegue después).
    const requestId = ++get().latestSearchRequestId;
    set({ latestSearchRequestId: requestId });

    if (!searchTerm.trim()) {
      set({ suggestions: [] });
      return;
    }

    set({ isLoading: true });

    // El buscador general pide `restrictToRegions: false` para encontrar todo
    // (fraccionamientos, POIs…), igual que el buscador de los posts de búsqueda.
    // El buscador del mapa usa el default ("(regions)") y conserva su contador.
    const types = opts?.restrictToRegions === false ? undefined : "(regions)";
    const withCounts = opts?.withCounts !== false;

    // Location bias: si el caller proporciona el estado del usuario, resolver sus
    // coordenadas centrales para sesgar los resultados de Google Places hacia esa zona.
    const config = getCountryConfig(country);

    // Fallback: si el caller no proporcionó estado, consultar Supabase directo
    // (cubre casos donde AuthContext no tenga el perfil cargado)
    let effectiveEstado = opts?.estado;
    if (!effectiveEstado) {
      try {
        const { data: s } = await supabase.auth.getSession();
        const uid = s?.session?.user?.id;
        if (uid) {
          const { data: p } = await supabase.from("perfiles").select("estado").eq("id", uid).maybeSingle();
          if (p?.estado) effectiveEstado = p.estado;
        }
      } catch { /* continuar sin bias */ }
    }

    const biasCoords = effectiveEstado ? config.level1Coords[effectiveEstado] : undefined;

    // DEBUG: parámetros de la request a Google Places
    console.log("[DEBUG locationSearch] REQUEST:", {
      searchTerm,
      types: types ?? "(todos - sin filtro)",
      effectiveEstado: effectiveEstado ?? "(sin estado)",
      biasCoords: biasCoords ?? "(sin bias)",
      radius: biasCoords ? 100000 : undefined,
    });

    try {
      const { sessionToken } = get();
      const results = await searchLocations(
        searchTerm, 10, sessionToken, country, types,
        biasCoords ?? undefined,
        biasCoords ? 100000 : undefined,
      );

      // Respuesta obsoleta (se escribió más mientras esta volaba): se descarta.
      if (requestId !== get().latestSearchRequestId) return;

      // DEBUG: resultados CRUDOS de Google (antes de enriquecer/filtrar)
      console.log("[DEBUG locationSearch] GOOGLE CRUDO:", results.map((r, i) => ({
        orden: i + 1,
        name: r.name,
        type: r.type,
        secondaryText: r.secondaryText,
        types: r.types,
      })));

      const enriched: LocationSuggestionWithCount[] = results.map((loc) => ({
        ...loc,
        ...extractMunicipioEstado(loc, country),
      }));

      // DEBUG: resultados enriquecidos (con municipio/estado derivados)
      console.log("[DEBUG locationSearch] ENRIQUECIDO:", enriched.map((s) => ({
        name: s.name,
        type: s.type,
        estado_nombre: s.estado_nombre,
        municipio_nombre: s.municipio_nombre,
      })));

      // Re-rank + fallback geográfico:
      // 1) Google Places bias (location+radius) es insuficiente: ciudades grandes
      //    de otros estados aparecen primero. El re-rank sube resultados locales.
      // 2) Fallback: si hay menos de 2 sugerencias del estado del usuario, Google
      //    no incluyó resultados locales menos prominentes (ej. "San Nicolás Premier").
      //    Se hace una segunda búsqueda con "{query}, {estado}" y se fusionan.
      let combined = enriched;
      if (effectiveEstado) {
        const localCount = enriched.filter(
          (s) => s.estado_nombre?.toLowerCase() === effectiveEstado.toLowerCase(),
        ).length;
        if (localCount < 2) {
          const fallbackSearchTerm = `${searchTerm}, ${effectiveEstado}`;
          // DEBUG: se dispara el fallback porque hay menos de 2 resultados locales
          console.log("[DEBUG locationSearch] FALLBACK TRIGGER:", {
            reason: `localCount=${localCount} < 2`,
            fallbackSearchTerm,
            localCount,
          });
          const fallbackResults = await searchLocations(
            fallbackSearchTerm, 5, sessionToken, country, "(regions)",
          );
          if (requestId !== get().latestSearchRequestId) return;

          // DEBUG: resultados CRUDOS del fallback
          console.log("[DEBUG locationSearch] FALLBACK CRUDO:", fallbackResults.map((r, i) => ({
            orden: i + 1,
            name: r.name,
            type: r.type,
            secondaryText: r.secondaryText,
            types: r.types,
          })));

          const fallbackEnriched = fallbackResults.map((loc) => ({
            ...loc,
            ...extractMunicipioEstado(loc, country),
          }));
          const firstIds = new Set(enriched.map((s) => s.placeId));
          const nonDuplicated = fallbackEnriched.filter((s) => !firstIds.has(s.placeId));
          combined = [...enriched, ...nonDuplicated];
        }
      }

      // ── FILTRAR RUIDO (antes del fallback a BD) ───────────────────────────
      // Eliminamos establecimientos, calles y POIs que no son relevantes para
      // bienes raíces (solo interesan colonias, fraccionamientos, municipios, estados).
      // NOTA: Los fraccionamientos y residenciales en México son marcados por Google
      // como "establishment" o "point_of_interest", así que los dejamos pasar si el
      // nombre contiene palabras clave residenciales.
      combined = combined.filter((s) => !isNoiseSuggestion(s.types, s.name));

      // DEBUG: después de filtrar ruido (antes de decidir el fallback a BD)
      console.log("[DEBUG locationSearch] POST-FILTRO-RUIDO:", combined.map((s) => ({
        name: s.name,
        estado: s.estado_nombre,
        types: s.types,
        propertyCount: s.propertyCount,
      })));

      // ── FALLBACK A PROPIEDADES ────────────────────────────────────────────
      // Si después del filtro de ruido seguimos con muy pocos resultados locales,
      // buscamos en las direcciones de las propiedades activas.
      // Esto cubre zonas que Google no conoce pero que existen en la BD.
      const localCountPostNoise = combined.filter(
        (s) => s.estado_nombre?.toLowerCase() === effectiveEstado?.toLowerCase(),
      ).length;

      if (localCountPostNoise < 2) {
        const { data: propLocations } = await supabase.rpc(
          "buscar_ubicaciones_desde_propiedades",
          {
            q: searchTerm,
            p_estado_usuario: effectiveEstado ?? null,
            lim: 5,
            p_pais: country ?? null,
          },
        );
        if (requestId !== get().latestSearchRequestId) return;

        // DEBUG: resultados CRUDOS del fallback a propiedades
        console.log("[DEBUG locationSearch] FALLBACK DB CRUDO:", propLocations);

        if (Array.isArray(propLocations) && propLocations.length > 0) {
          const propSuggestions: LocationSuggestionWithCount[] = propLocations
            .filter((p: any) => {
              // Evitar duplicados: si ya tenemos un resultado con el mismo nombre
              // y estado, no agregarlo
              return !combined.some(
                (c) =>
                  c.name.toLowerCase() === (p.nombre ?? "").toLowerCase() &&
                  c.estado_nombre?.toLowerCase() === (p.estado ?? "").toLowerCase(),
              );
            })
            .map((p: any) => ({
              placeId: `prop-${p.nombre}-${p.municipio}-${p.estado}`,
              name: p.nombre ?? "",
              secondaryText: [p.municipio, p.estado].filter(Boolean).join(", "),
              fullDescription: p.full_description ?? "",
              type: (p.tipo ?? "colonia") as "estado" | "municipio" | "colonia",
              types: ["colonia"],
              municipio_nombre: p.municipio ?? undefined,
              estado_nombre: p.estado ?? undefined,
              propertyCount: Number(p.total) || 0,
            }));

          combined = [...combined, ...propSuggestions];
          console.log("[DEBUG locationSearch] POST-FALLBACK-DB:", combined.map((s) => ({
            name: s.name,
            estado: s.estado_nombre,
            types: s.types,
            propertyCount: s.propertyCount,
            placeId: s.placeId,
          })));
        } else {
          console.log("[DEBUG locationSearch] FALLBACK DB: sin resultados");
        }
      }

      // ── NORMALIZAR NOMBRES SIMILARES ──────────────────────────────────
      // Cuando un resultado de la BD (ej. "Loretta") y uno de Google (ej. "Loretta II")
      // son essentially la misma zona, agruparlos y conservar el MEJOR de ambos.
      // Criterio: mismo estado, y un nombre contiene al otro (sin distinción de
      // número romano / cardinal / "II", "III", "Norte", "Sur", etc.)
      const NORMALIZE_SUFFIXES = [
        " ii", " iii", " iv", " v", " vi", " vii", " viii", " ix", " x",
      ];
      function normalizeForMatch(name: string): string {
        const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        for (const s of NORMALIZE_SUFFIXES) {
          if (n.endsWith(s)) return n.slice(0, -s.length).trim();
        }
        return n;
      }
      // DEBUG: normalizacion
      const preNormalizeDebug = combined.map((s) => ({
        name: s.name,
        normalizedName: normalizeForMatch(s.name),
      }));
      console.log("[DEBUG locationSearch] PRE-NORMALIZE:", preNormalizeDebug);
      const seenRoots = new Map<string, number>(); // root → first index
      const normalized: typeof combined = [];
      for (let i = 0; i < combined.length; i++) {
        const item = combined[i];
        const root = normalizeForMatch(item.name);
        if (!seenRoots.has(root)) {
          seenRoots.set(root, normalized.length);
          normalized.push(item);
        } else {
          const existingIdx = seenRoots.get(root)!;
          const existing = normalized[existingIdx];
          // Reemplazar si: el nuevo tiene más propertyCount O es de Google (placeId no empieza con "prop-")
          const existingFromGoogle = !existing.placeId.startsWith("prop-");
          const itemFromGoogle = !item.placeId.startsWith("prop-");
          if (itemFromGoogle && !existingFromGoogle) {
            // El de Google gana sobre el de BD → reemplazar
            normalized[existingIdx] = item;
            console.log("[DEBUG locationSearch] NORMALIZE: reemplazo", existing.name, "→", item.name, "(google > db)");
          } else if ((item.propertyCount ?? 0) > (existing.propertyCount ?? 0)) {
            // Mismo source (ambos BD o ambos Google): gana el de más propiedades
            normalized[existingIdx] = item;
            console.log("[DEBUG locationSearch] NORMALIZE: reemplazo", existing.name, "→", item.name, "(más propiedades)");
          } else {
            console.log("[DEBUG locationSearch] NORMALIZE: descarte", item.name, "por", existing.name);
          }
        }
      }
      combined = normalized;

      // DEBUG: combinado final (post-fallback + normalize) listo para scoring
      console.log("[DEBUG locationSearch] COMBINADO FINAL:", combined.map((s) => ({
        name: s.name,
        type: s.type,
        estado_nombre: s.estado_nombre,
        types: s.types,
      })));
      // Score textual: priorizar coincidencia exacta, empieza con, contiene
      // Normalizar acentos para que "Nicolás" == "Nicolas" (el usuario escribe sin acentos)
      const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const q = norm(searchTerm);
      const withScore = combined.map((s) => {
        const name = norm(s.name);
        const score = name === q ? 0
          : name.startsWith(q) ? 1
          : name.includes(q) ? 2
          : 3;
        return { ...s, _score: score };
      });
      // La pertenencia geográfica es el criterio PRINCIPAL (partición
      // dura), el score de texto ordena dentro de cada grupo. Así los
      // resultados del estado del usuario quedan TODOS agrupados antes que
      // los de fuera (nunca intercalados), y un match exacto de texto fuera
      // del estado ya no le gana a un resultado local (caso "Rosello").
      const ranked = withScore.sort((a, b) => {
        if (effectiveEstado) {
          const aLocal = a.estado_nombre?.toLowerCase() === effectiveEstado.toLowerCase();
          const bLocal = b.estado_nombre?.toLowerCase() === effectiveEstado.toLowerCase();
          if (aLocal !== bLocal) return aLocal ? -1 : 1;
        }
        return a._score - b._score;
      });

      // Mostrar las sugerencias de inmediato (y quitar el spinner); el conteo
      // se rellena después sin bloquear la UI.
      set({ suggestions: ranked, isLoading: false });

      // DEBUG: resultado FINAL ordenado que ve la UI
      console.log("[DEBUG locationSearch] FINAL ORDENADO:", ranked.map((s) => ({
        name: s.name,
        type: s.type,
        estado_nombre: s.estado_nombre,
        _score: s._score,
      })));

      // Conteo de propiedades por zona (diferido, no bloquea la UI).
      // Se cuenta usando la JERARQUÍA de la sugerencia (nombre + municipio +
      // estado) para evitar falsos positivos por nombres repetidos en distintas
      // regiones (p. ej. "Centro" existe en muchas ciudades).
      // Se omite si el caller no muestra el conteo (p. ej. buscador general).
      if (withCounts && ranked.length > 0) {
        const keyOf = (
          tipo?: string | null,
          nombre?: string | null,
          municipio?: string | null,
          estado?: string | null,
        ) => `${tipo ?? ""}|${nombre ?? ""}|${municipio ?? ""}|${estado ?? ""}`;
        try {
          const zonas = ranked.map((s) => ({
            tipo: s.type,
            nombre: s.name,
            municipio: s.municipio_nombre ?? null,
            estado: s.estado_nombre ?? null,
          }));
          const { data: counts } = await supabase.rpc(
            "contar_propiedades_zonas",
            { p_zonas: zonas, p_pais: country },
          );
          if (requestId !== get().latestSearchRequestId) return;
          if (Array.isArray(counts) && counts.length > 0) {
            const countMap = new Map<string, number>(
              counts.map((c: {
                tipo: string;
                nombre: string;
                municipio: string | null;
                estado: string | null;
                total: number;
              }) => [keyOf(c.tipo, c.nombre, c.municipio, c.estado), Number(c.total) || 0]),
            );
            // Emparejar por (tipo, nombre, municipio, estado); seguro ante concurrencia.
            set((state) => ({
              suggestions: state.suggestions.map((s) => {
                const total = countMap.get(
                  keyOf(s.type, s.name, s.municipio_nombre, s.estado_nombre),
                );
                return total != null ? { ...s, propertyCount: total } : s;
              }),
            }));
          }
        } catch (e) {
          log.warn("Error contando propiedades por zona:", e);
        }
      }
    } catch (error) {
      if (requestId !== get().latestSearchRequestId) return;
      log.error("Error fetching location suggestions:", error);
      set({ suggestions: [] });
    } finally {
      if (requestId === get().latestSearchRequestId) set({ isLoading: false });
    }
  },
}));
