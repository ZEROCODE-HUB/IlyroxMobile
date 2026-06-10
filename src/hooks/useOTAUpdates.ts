import { useEffect } from "react";
import {
  checkForUpdateAsync,
  fetchUpdateAsync,
  reloadAsync,
} from "@/lib/expoUpdates";
import { logger } from "@/utils/logger";

const log = logger.scoped("useOTAUpdates");

/**
 * Verifica y aplica actualizaciones OTA (EAS Update) de forma silenciosa al
 * iniciar la app. Si hay una actualización disponible, la descarga y recarga
 * la app inmediatamente (el usuario ve el splash y arranca ya actualizado).
 *
 * Solo corre en builds de producción: en desarrollo (Metro) `__DEV__` es true
 * y expo-updates está deshabilitado, así que se omite.
 *
 * Convive con `useVersionCheck`: OTA cubre cambios solo-JS sin pasar por la
 * tienda; `useVersionCheck` fuerza actualización de tienda cuando hay cambios
 * nativos (nuevo `runtimeVersion`).
 */
export const useOTAUpdates = () => {
  useEffect(() => {
    if (__DEV__) return;
    (async () => {
      try {
        const update = await checkForUpdateAsync();
        if (update.isAvailable) {
          await fetchUpdateAsync();
          await reloadAsync();
        }
      } catch (error) {
        // Silencioso: sin red o sin update disponible, la app sigue normal.
        log.error("Error al verificar actualización OTA:", error);
      }
    })();
  }, []);
};
