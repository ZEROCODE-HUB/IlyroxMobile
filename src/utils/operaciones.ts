/**
 * Una propiedad puede estar en venta y en renta a la vez (varias filas en
 * `operaciones_propiedad`). Tomar `operaciones[0]` daba la que viniera primero
 * (orden no garantizado), así que una propiedad en renta podía mostrar su precio
 * de venta. Este helper elige la operación correcta.
 */

type OperacionLike = { tipo_operacion?: string | null; activa?: boolean | null };

/** "sale"/"rent" (EasyBroker/Tokko) → "venta"/"renta". */
export function normalizarTipoOperacion(tipo?: string | null): string {
  const t = String(tipo ?? "").trim().toLowerCase();
  if (t === "sale") return "venta";
  if (t === "rent" || t === "rental") return "renta";
  return t;
}

/**
 * Devuelve la operación a mostrar:
 *  - Solo entre las activas (si ninguna trae `activa`, se consideran todas).
 *  - Si se pide un tipo (p. ej. el del filtro o el de la búsqueda), esa.
 *  - Si no, la de venta, y si no hay venta, la primera.
 */
export function pickOperacion<T extends object>(
  operaciones: T[] | T | null | undefined,
  tipo?: string | null,
): T | undefined {
  const all = Array.isArray(operaciones) ? operaciones : operaciones ? [operaciones] : [];
  const valid = all.filter((o): o is T => !!o);
  const activas = valid.filter((o) => (o as OperacionLike).activa !== false);
  const pool = activas.length > 0 ? activas : valid;
  const tipoOf = (o: T) => normalizarTipoOperacion((o as OperacionLike).tipo_operacion);

  const buscado = normalizarTipoOperacion(tipo);
  if (buscado) {
    const match = pool.find((o) => tipoOf(o) === buscado);
    if (match) return match;
  }
  return pool.find((o) => tipoOf(o) === "venta") ?? pool[0];
}
