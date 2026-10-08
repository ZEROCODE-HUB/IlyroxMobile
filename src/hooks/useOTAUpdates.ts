import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { checkForUpdateAsync, fetchUpdateAsync } from "@/lib/expoUpdates";
import { logger } from "@/utils/logger";

const log = logger.scoped("useOTAUpdates");

/**
 * Verifica y descarga actualizaciones OTA (EAS Update) silenciosamente.
 *
 * Diferencias con la versión anterior (que solo chequeaba en mount):
 *  - Espera 1s antes del primer check para que el splash nativo se haya
 *    ocultado y la UI esté lista. Llamar `reloadAsync()` durante el splash
 *    en iOS dejaba la app en un estado inconsistente y el update nunca se
 *    aplicaba.
 *  - Re-chequea al volver del background (`AppState → active`), igual que
 *    hace el proyecto de referencia (racynkx). Si publicas un OTA con la
 *    app abierta, no había forma de detectarlo sin un reinicio completo.
 *  - NO llama `reloadAsync()`: el update descargado se aplica en el
 *    siguiente cold start. Es el patrón recomendado por Expo y evita los
 *    problemas de timing del reload inmediato.
 *
 * Convive con `useVersionCheck`: OTA cubre cambios solo-JS sin pasar por la
 * tienda; `useVersionCheck` fuerza actualización de tienda cuando hay cambios
 * nativos (nuevo `runtimeVersion`).
 */
export const useOTAUpdates = () => {
  const isChecking = useRef(false);

  useEffect(() => {
    if (__DEV__) return;

    const checkForUpdate = async () => {
      if (isChecking.current) return;
      try {
        isChecking.current = true;
        const update = await checkForUpdateAsync();
        if (update.isAvailable) {
          await fetchUpdateAsync();
          log.info("OTA descargado, se aplicará en el próximo inicio de la app.");
        }
      } catch (error) {
        // Sin red o sin update disponible: la app sigue normal.
        log.error("Error al verificar actualización OTA:", error);
      } finally {
        isChecking.current = false;
      }
    };

    // Delay para que el splash nativo se oculte y la UI esté lista.
    const timer = setTimeout(checkForUpdate, 1000);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        checkForUpdate();
      }
    };
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);
};
