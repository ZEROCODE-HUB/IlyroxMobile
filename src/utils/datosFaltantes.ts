import { getCamposVisibles, TipoPrincipal } from "@/constants/propertyData";

const TIPOS = ["habitacional", "comercial", "industrial", "agricola"];

/**
 * REV16: datos que le faltan a una propiedad para estar completa (hoy: niveles). Se muestra al dueno como etiqueta.
 * Solo avisa cuando el tipo es conocido y el campo realmente aplica a ese tipo/subtipo (sin falsos positivos).
 */
export function datosFaltantes(p: any): string[] {
  if (!p) return [];
  const tipo = String(p.type ?? "").toLowerCase();
  if (!TIPOS.includes(tipo) || tipo === "industrial") return [];
  const subtipo = p.subtype ?? p.subtipo ?? "";
  const cv = getCamposVisibles(subtipo, tipo as TipoPrincipal);
  const faltan: string[] = [];
  const niveles = Number(p.features?.floors ?? p.pisos ?? 0);
  if (cv.niveles && !(niveles > 0)) faltan.push("niveles");
  return faltan;
}
