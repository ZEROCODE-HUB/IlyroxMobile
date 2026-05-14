/**
 * Formatea un precio con separadores de miles y moneda opcional.
 * Ejemplo: formatPrice(1500000, "MXN") → "$1,500,000 MXN"
 */
export function formatPrice(price: number, currency?: string): string {
  const formatted = `$${price.toLocaleString("es-MX")}`;
  return currency ? `${formatted} ${currency}` : formatted;
}

/**
 * Formatea un precio en forma abreviada (K/M).
 * Ejemplo: formatPriceShort(1500000) → "$1.5M"
 *          formatPriceShort(250000)  → "$250k"
 */
export function formatPriceShort(price: number): string {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}k`;
  return `$${price}`;
}

/**
 * Formatea una operación de propiedad (tipo + precio + moneda).
 * Ejemplo: "Venta: $2,500,000 MXN"
 */
export function formatOperation(
  tipoOperacion: string | null | undefined,
  precio: number | null | undefined,
  moneda: string | null | undefined,
): string {
  const tipo = tipoOperacion === "venta" ? "Venta" : "Renta";
  if (!precio) return tipo;
  return `${tipo}: ${formatPrice(precio, moneda ?? undefined)}`;
}
