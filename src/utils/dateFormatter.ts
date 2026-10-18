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

/**
 * Días de calendario entre `date` y hoy (0 = hoy, 1 = ayer…), en hora local.
 * No usa bloques de 24 h: un mensaje de ayer a las 23:00 visto hoy a las
 * 08:00 cuenta como "ayer", no como "hoy".
 */
function calendarDaysAgo(date: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((today.getTime() - day.getTime()) / 86_400_000);
}

const NUMERIC_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

/**
 * Fecha de una conversación en la lista, estilo WhatsApp: hora si es de hoy,
 * "Ayer", el día de la semana dentro de los últimos 7 días, o dd/mm/aaaa.
 */
export function formatChatListDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const days = calendarDaysAgo(d);
  if (days <= 0) return formatTime(d);
  if (days === 1) return "Ayer";
  if (days < 7) return d.toLocaleDateString("es-MX", { weekday: "long" });
  return d.toLocaleDateString("es-MX", NUMERIC_DATE_OPTIONS);
}

/**
 * Separador de fecha dentro del chat, estilo WhatsApp: "Hoy", "Ayer", el día
 * de la semana dentro de los últimos 7 días, o dd/mm/aaaa.
 */
export function formatChatSeparatorDate(date: string | Date): string {
  const d = new Date(date);
  const days = calendarDaysAgo(d);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return d.toLocaleDateString("es-MX", { weekday: "long" });
  return d.toLocaleDateString("es-MX", NUMERIC_DATE_OPTIONS);
}
