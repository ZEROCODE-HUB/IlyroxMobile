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

const getTimeZoneParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return localAsUtc - date.getTime();
};

const zonedLocalTimeToUtc = (
  fecha: string,
  hora: string,
  sourceTimeZone: string,
) => {
  const [year, month, day] = fecha.split("-").map(Number);
  const [hour = 0, minute = 0, second = 0] = hora.split(":").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const firstOffset = getTimeZoneOffsetMs(new Date(localAsUtc), sourceTimeZone);
  const firstGuess = new Date(localAsUtc - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(firstGuess, sourceTimeZone);

  return new Date(localAsUtc - secondOffset);
};

const getDateKeyInTimeZone = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
};

export const getAppointmentViewerTimeZone = (
  creatorTimeZone: string | null | undefined,
  isCreator: boolean,
) =>
  isCreator
    ? creatorTimeZone || getDeviceTimeZone()
    : getDeviceTimeZone();

export const formatAppointmentDateTimeForTimeZone = (
  fecha: string,
  hora: string,
  sourceTimeZone: string | null | undefined,
  targetTimeZone: string,
) => {
  const source = sourceTimeZone || DEFAULT_APPOINTMENT_TIME_ZONE;
  const date = zonedLocalTimeToUtc(fecha, hora, source);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const appointmentKey = getDateKeyInTimeZone(date, targetTimeZone);
  const todayKey = getDateKeyInTimeZone(today, targetTimeZone);
  const tomorrowKey = getDateKeyInTimeZone(tomorrow, targetTimeZone);

  const dateLabel =
    appointmentKey === todayKey
      ? "Hoy"
      : appointmentKey === tomorrowKey
        ? "Mañana"
        : new Intl.DateTimeFormat("es-MX", {
            timeZone: targetTimeZone,
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(date);

  const timeLabel = new Intl.DateTimeFormat("es-MX", {
    timeZone: targetTimeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return { dateLabel, timeLabel };
};