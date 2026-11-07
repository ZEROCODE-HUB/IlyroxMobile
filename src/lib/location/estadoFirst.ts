/**
 * REV24: mismo criterio del buscador general para el selector de ubicacion al crear/editar una propiedad.
 * Si lo escrito es (o empieza como) el nombre de UN estado ("aguas calientes", "jalis") o su abreviatura ("ags", "cdmx"), el orden es:
 * 1) el estado, 2) las colonias de ese estado (la homonima primero), 3) sus municipios, 4) el resto.
 */
import { getCountryConfig, DEFAULT_COUNTRY } from "./registry";
import { searchPlaces, derivePlaceType, type PlaceSuggestion } from "../geocodingService";

const compacto = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const mismo = (x: string, y: string) =>
  x.length >= 4 && y.length >= 4 && (x === y || x.startsWith(y) || y.startsWith(x));

/** Estado de una sugerencia, leido del final de su texto secundario. Google lo abrevia ("Ags.", "Jal.", "CDMX"). */
function estadoDe(s: PlaceSuggestion): string {
  const cfg = getCountryConfig(DEFAULT_COUNTRY);
  let sec = (s.secondaryText || "").trim();
  for (const suf of cfg.countrySuffixes) sec = sec.replace(new RegExp(`(,\\s*|^)${suf}\\s*$`, "i"), "");
  const partes = sec.split(",").map((x) => x.trim()).filter(Boolean);
  if (!partes.length) return "";
  const ult = partes[partes.length - 1];
  const k = ult.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\.$/, "").trim();
  return cfg.stateAbbreviations?.[k] ?? ult;
}

export async function priorizarEstado(
  texto: string,
  resultados: PlaceSuggestion[],
  token?: string,
): Promise<PlaceSuggestion[]> {
  try {
    const q = compacto(texto);
    const cfg = getCountryConfig(DEFAULT_COUNTRY);
    const nombres = Object.keys(cfg.level1Coords);
    // Abreviaturas escritas tal cual ("ags", "jal.", "cdmx", "nl"); "col" se ignora porque tambien es "colonia".
    const claveAbrev = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\.$/, "").trim();
    const porAbrev = claveAbrev !== "col" ? cfg.stateAbbreviations?.[claveAbrev] : undefined;
    let candidatos: string[];
    if (porAbrev) {
      candidatos = nombres.filter((n) => compacto(n) === compacto(porAbrev));
    } else {
      if (q.length < 4) return resultados;
      const exactos = nombres.filter((n) => compacto(n) === q);
      candidatos = exactos.length ? exactos : nombres.filter((n) => compacto(n).startsWith(q));
    }
    if (candidatos.length !== 1) return resultados;
    const est = candidatos[0];
    const key = compacto(est);
    const esEstado = (s: PlaceSuggestion) =>
      derivePlaceType(s.types || []) === "estado" && mismo(compacto(s.mainText), key);
    let estadoItem = resultados.find(esEstado);
    if (!estadoItem) {
      try {
        const extra = await searchPlaces(`${est}, M\u00e9xico`, token, undefined, "(regions)");
        estadoItem = extra.find(esEstado);
      } catch {
        /* sin estado extra */
      }
    }
    if (!estadoItem) return resultados;
    const resto = resultados.filter((s) => s.placeId !== estadoItem!.placeId);
    const delEstado = (s: PlaceSuggestion) => mismo(compacto(estadoDe(s)), key);
    const homonima = (s: PlaceSuggestion) => mismo(compacto(s.mainText), key);
    const colonias = resto
      .filter((s) => delEstado(s) && derivePlaceType(s.types || []) === "colonia")
      .sort((x, y) => Number(homonima(y)) - Number(homonima(x)));
    const munis = resto.filter((s) => delEstado(s) && derivePlaceType(s.types || []) !== "colonia");
    const otros = resto.filter((s) => !delEstado(s));
    return [estadoItem, ...colonias, ...munis, ...otros];
  } catch {
    return resultados;
  }
}
