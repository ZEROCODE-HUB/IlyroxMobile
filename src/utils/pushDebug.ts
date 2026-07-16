/**
 * Traza de diagnóstico del arranque por notificación push.
 *
 * TEMPORAL: existe solo para depurar por qué, con la app cerrada, tocar una
 * notificación no abre el chat. Cuando el bug esté resuelto, borrar este archivo
 * junto con PushDebugOverlay y las llamadas a `plog` en app/_layout.tsx.
 *
 * Se registra a nivel de módulo (no en React) porque los eventos que interesan
 * ocurren ANTES de que monte cualquier componente.
 */

const startedAt = Date.now();
const lines: string[] = [];
const listeners = new Set<() => void>();

function stringify(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Añade una línea a la traza, con los ms transcurridos desde que cargó el JS. */
export function plog(message: string, extra?: unknown) {
  const ms = Date.now() - startedAt;
  const suffix = extra === undefined ? "" : ` ${stringify(extra)}`;
  lines.push(`+${String(ms).padStart(5, " ")}ms  ${message}${suffix}`);
  listeners.forEach((fn) => fn());
}

export function getPushLog(): string {
  if (lines.length === 0) return "(sin eventos todavía)";
  return lines.join("\n");
}

export function clearPushLog() {
  lines.length = 0;
  listeners.forEach((fn) => fn());
}

export function subscribePushLog(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

plog("JS cargado (inicio de la traza)");
