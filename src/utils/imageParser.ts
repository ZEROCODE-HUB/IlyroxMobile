/**
 * Parsea el campo `fotos`/`imagenes` que puede llegar como array, JSON string o CSV.
 * Centraliza la lógica que estaba duplicada en PropertyDetail, Charts, Matches, etc.
 */
export function parseImages(
  rawFotos: string[] | string | null | undefined,
): string[] {
  if (!rawFotos) return [];
  if (Array.isArray(rawFotos)) return rawFotos;
  const trimmed = rawFotos.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // fallthrough a CSV
    }
  }
  return trimmed.includes(",")
    ? trimmed.split(",").map((s) => s.trim()).filter(Boolean)
    : [trimmed];
}
