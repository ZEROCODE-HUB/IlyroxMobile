/**
 * REV15: tiempo de una cita.
 * `fecha` ("YYYY-MM-DD") y `hora` ("HH:mm" o "HH:mm:ss") se interpretan en la hora LOCAL del telefono, igual que se
 * muestran en la tarjeta de la cita. Una cita dura DURACION_CITA_MIN minutos (valor unico y simple); pasado ese tiempo
 * deja de ser "proxima" y pasa a "anteriores". Sin hora valida se considera de todo el dia.
 */
export const DURACION_CITA_MIN = 120;

const parteFecha = (fecha?: string | null): [number, number, number] | null => {
  if (!fecha || typeof fecha !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

const parteHora = (hora?: string | null): [number, number] | null => {
  if (!hora || typeof hora !== "string") return null;
  const p = hora.trim().split(/[:\s]/).filter(Boolean);
  if (p.length < 2) return null;
  const h = parseInt(p[0], 10);
  const m = parseInt(p[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return [h, m];
};

/** Momento (ms) en que empieza la cita; sin hora valida, el inicio del dia. null si la fecha no es valida. */
export function inicioCitaMs(fecha?: string | null, hora?: string | null): number | null {
  const f = parteFecha(fecha);
  if (!f) return null;
  const h = parteHora(hora) ?? [0, 0];
  return new Date(f[0], f[1] - 1, f[2], h[0], h[1], 0, 0).getTime();
}

/** La hora de inicio ya llego (sirve para mostrar "La cita se realizo"). Sin fecha valida: false. */
export function citaYaInicio(fecha?: string | null, hora?: string | null, ahora: number = Date.now()): boolean {
  const ini = inicioCitaMs(fecha, hora);
  return ini !== null && ahora >= ini;
}

/** La cita ya termino: inicio + duracion; sin hora valida, al terminar el dia. Sin fecha valida: false. */
export function citaTerminada(
  fecha?: string | null,
  hora?: string | null,
  ahora: number = Date.now(),
  duracionMin: number = DURACION_CITA_MIN,
): boolean {
  const f = parteFecha(fecha);
  if (!f) return false;
  if (!parteHora(hora)) return ahora > new Date(f[0], f[1] - 1, f[2], 23, 59, 59, 999).getTime();
  const ini = inicioCitaMs(fecha, hora) as number;
  return ahora >= ini + duracionMin * 60000;
}

/** Fecha LOCAL "YYYY-MM-DD" de hoy desplazada `dias` (el .toISOString() anterior usaba la fecha UTC y adelantaba el dia). */
export function fechaLocalISO(dias: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
