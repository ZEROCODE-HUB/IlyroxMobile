const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

/**
 * Formatea una fecha en formato corto legible en español (ej. "05 may. 2025").
 */
export function formatDateShort(date: string | Date): string {
  return new Date(date).toLocaleDateString("es-MX", SHORT_DATE_OPTIONS);
}

/**
 * Formatea solo la hora (ej. "14:30").
 */
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("es-MX", TIME_OPTIONS);
}

/**
 * Retorna tiempo relativo legible: "hace 2h", "ayer", "hace 3 días", o la fecha corta
 * si es más de 7 días atrás.
 */
export function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  return formatDateShort(date);
}
