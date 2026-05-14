/**
 * Normaliza un string para comparaciones: minúsculas, sin acentos, sin espacios extra.
 * Centraliza las 3+ implementaciones dispersas con regex inconsistentes.
 */
export function normalizeStr(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Produce un slug de tipo de post: minúsculas, sin acentos, sin espacios.
 * Usado para comparar "Open House" → "openhouse", "Aniversario" → "aniversario", etc.
 */
export function normalizePostType(tipo?: string): string {
  if (!tipo) return "post";
  return tipo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "");
}
