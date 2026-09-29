export const DEFAULT_APPOINTMENT_TIME_ZONE = "America/La_Paz";

export const getDeviceTimeZone = () => {
  try {
    return (
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      DEFAULT_APPOINTMENT_TIME_ZONE
    );
  } catch {
    return DEFAULT_APPOINTMENT_TIME_ZONE;
  }
};

export const EMPTY_APPOINTMENT_TIME = "--:--";
export const EMPTY_APPOINTMENT_DATE = "Fecha pendiente";

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Normaliza "09:00:00" | "9:00" | "09:00" | "9:00 a. m." -> "HH:mm". null si no es hora válida. */
export const formatAppointmentTimeLabel = (
  hora: string | null | undefined,
): string => {
  if (!hora || typeof hora !== "string") return EMPTY_APPOINTMENT_TIME;
  const trimmed = hora.trim();
  if (!trimmed) return EMPTY_APPOINTMENT_TIME;

  const parts = trimmed.split(/[:\s]/).filter(Boolean);
  if (parts.length < 2) return EMPTY_APPOINTMENT_TIME;

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);

  if (isNaN(h) || isNaN(m)) return EMPTY_APPOINTMENT_TIME;
  if (h < 0 || h > 23 || m < 0 || m > 59) return EMPTY_APPOINTMENT_TIME;

  return `${pad2(h)}:${pad2(m)}`;
};

const toLocalDateKey = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** "Hoy" | "Mañana" | "YYYY-MM-DD" (crudo, para que AppointmentList.formatDate lo parsee). */
export const formatAppointmentDateLabel = (
  fecha: string | null | undefined,
): string => {
  if (!fecha || typeof fecha !== "string") return EMPTY_APPOINTMENT_DATE;
  const trimmed = fecha.trim();
  if (!trimmed) return EMPTY_APPOINTMENT_DATE;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return EMPTY_APPOINTMENT_DATE;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const key = trimmed;
  if (key === toLocalDateKey(today)) return "Hoy";
  if (key === toLocalDateKey(tomorrow)) return "Mañana";
  return key;
};

export const formatAppointmentDateTime = (
  fecha: string | null | undefined,
  hora: string | null | undefined,
): { dateLabel: string; timeLabel: string } => ({
  dateLabel: formatAppointmentDateLabel(fecha),
  timeLabel: formatAppointmentTimeLabel(hora),
});
