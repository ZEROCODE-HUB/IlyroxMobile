/**
 * +native-intent.ts
 * Punto de entrada de expo-router para toda URL que abre la app: universal
 * links (https://ilyrox-posts.vercel.app/?type=..&id=..) y esquema propio
 * (ilyroxapp://?type=..&id=..).
 *
 * Corre ANTES del ruteo, así que cubre por igual el arranque en frío y la app
 * ya viva, sin depender de listeners en _layout.
 */

import { parseSharedLink, setPendingDeepLink } from "@/utils/deepLink";
import { logger } from "@/utils/logger";

const log = logger.scoped("nativeIntent");

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  // Si esto lanza, la app no arranca: cualquier fallo cae al path original.
  try {
    const target = parseSharedLink(path);
    if (!target) return path;

    // El destino también se guarda: si no hay sesión, _layout redirige a /login
    // y sin esto el link se perdería tras iniciar sesión.
    setPendingDeepLink(target);
    return target.href;
  } catch (error) {
    log.error("No se pudo interpretar el deep link:", error);
    return path;
  }
}
