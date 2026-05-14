import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

const log = logger.scoped("useMatchNotifier");

/**
 * Llama a la Edge Function "notify-matches" después de publicar una propiedad.
 * La Edge Function consulta los matches creados por el trigger PostgreSQL
 * y envía notificaciones push a los usuarios via OneSignal REST API.
 *
 * Si la función no está desplegada, falla silenciosamente.
 */
export async function notifyMatchingUsers(propiedadId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("notify-matches", {
      body: { propiedad_id: propiedadId },
    });
    if (error) {
      log.warn("procesar-matches function error (non-critical):", error.message);
    }
  } catch (err) {
    log.warn("procesar-matches invocation failed (non-critical):", err);
  }
}
