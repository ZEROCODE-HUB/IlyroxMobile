/**
 * Formatea la antigüedad de una propiedad como EDAD en años.
 *
 * El campo `antiguedad` puede llegar de varias formas:
 *  - Año de construcción ("2021", típico de EasyBroker `age`) → se calcula la
 *    edad: año actual − año → "5 años".
 *  - Edad ya en años ("5") → "5 años".
 *  - Texto libre ("Nueva", "A estrenar", "En construcción") → se muestra igual.
 *  - Vacío/null → "Nueva".
 *
 * Guardar el AÑO y calcular la edad al vuelo es lo correcto: la edad se
 * actualiza sola cada año (guardar "5 años" quedaría desactualizado).
 */
export function formatPropertyAge(antiguedad?: string | number | null): string {
  // Vacío/sin dato = "No indicado" (NO "Nueva"): en EasyBroker un age vacío
  // significa "no indicado", y confundirlo con "Nueva" era incorrecto.
  if (antiguedad === null || antiguedad === undefined) return "No indicado";
  const raw = String(antiguedad).trim();
  if (raw === "") return "No indicado";

  // Enums de EasyBroker (llegan en inglés) → texto en español.
  const lower = raw.toLowerCase();
  if (lower === "new_construction") return "A estrenar";
  if (lower === "under_construction") return "En construcción";

  // Solo dígitos → puede ser un año de construcción o una edad ya calculada.
  if (/^\d+$/.test(raw)) {
    const num = Number(raw);
    const currentYear = new Date().getFullYear();

    // 4 dígitos dentro de un rango de años reales = año de construcción.
    if (num >= 1900 && num <= currentYear) {
      const edad = currentYear - num;
      if (edad <= 0) return "A estrenar";
      return `${edad} año${edad === 1 ? "" : "s"}`;
    }

    // 0 = recién terminada.
    if (num === 0) return "A estrenar";

    // Número pequeño = ya es la edad en años.
    return `${num} año${num === 1 ? "" : "s"}`;
  }

  // Texto libre: ya trae su propia unidad/estado, se muestra tal cual.
  return raw;
}
