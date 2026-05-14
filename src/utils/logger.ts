/**
 * Logger centralizado
 *
 * Sustituye llamadas sueltas a `console.*`. En producción (`__DEV__ === false`)
 * suprime debug/info para no contaminar los logs de dispositivo; warn/error
 * se conservan siempre para integrarse con Sentry u otros sinks más adelante.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env.NODE_ENV !== "production";

function format(scope: string | undefined, args: unknown[]) {
  return scope ? [`[${scope}]`, ...args] : args;
}

function emit(level: LogLevel, scope: string | undefined, args: unknown[]) {
  const payload = format(scope, args);
  switch (level) {
    case "debug":
      if (isDev) console.log(...payload);
      return;
    case "info":
      if (isDev) console.info(...payload);
      return;
    case "warn":
      console.warn(...payload);
      return;
    case "error":
      console.error(...payload);
      return;
  }
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  scoped: (scope: string) => Logger;
}

function create(scope?: string): Logger {
  return {
    debug: (...args) => emit("debug", scope, args),
    info: (...args) => emit("info", scope, args),
    warn: (...args) => emit("warn", scope, args),
    error: (...args) => emit("error", scope, args),
    scoped: (nested: string) =>
      create(scope ? `${scope}:${nested}` : nested),
  };
}

export const logger = create();
