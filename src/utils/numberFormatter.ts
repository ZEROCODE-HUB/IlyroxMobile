/**
 * Formatea un string con separadores de miles, conservando decimales si los hay.
 * Útil para inputs numéricos que se muestran al usuario con coma cada 3 dígitos.
 * Ejemplo: formatThousands("1500") → "1,500", formatThousands("1500.5") → "1,500.5"
 */
export const formatThousands = (text: string): string => {
  const raw = text.replace(/,/g, "");
  if (raw === "") return "";
  if (!/^\d*\.?\d*$/.test(raw)) return text;
  const parts = raw.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

/**
 * Parsea un string formateado con comas a número. Devuelve NaN si no es válido.
 * Ejemplo: parseFormattedNumber("1,500.5") → 1500.5
 */
export const parseFormattedNumber = (text: string): number => {
  if (!text) return NaN;
  return parseFloat(text.replace(/,/g, ""));
};
