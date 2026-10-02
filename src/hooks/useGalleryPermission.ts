/**
 * useGalleryPermission
 *
 * Pide y gestiona el permiso de galería (biblioteca de fotos) de forma
 * consistente en toda la app:
 *  - Si ya está concedido, no vuelve a pedirlo (lo recuerda el SO).
 *  - Si no está concedido pero se puede volver a preguntar, lo pide.
 *  - Si está bloqueado (denegado permanentemente), muestra un aviso y ofrece
 *    abrir los Ajustes del dispositivo.
 *
 * Devuelve `true` solo si hay permiso, para que quien lo use no abra la
 * galería cuando no corresponde.
 */

import { useCallback } from "react";
import { Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useModal } from "@/context/ModalContext";
import { logger } from "@/utils/logger";

const log = logger.scoped("useGalleryPermission");

export function useGalleryPermission() {
  const { showModal } = useModal();

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    try {
      // 1) ¿Ya está concedido? El SO lo recuerda: no se vuelve a preguntar.
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (current.granted) return true;

      // 2) Se puede volver a preguntar → pedir permiso.
      if (current.canAskAgain) {
        const requested =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (requested.granted) return true;

        // Rechazó en el diálogo. Si ya no se puede volver a preguntar,
        // ofrecemos abrir Ajustes; si aún se puede, solo avisamos.
        if (!requested.canAskAgain) {
          showModal({
            title: "Permiso de galería",
            message:
              "Para elegir fotos necesitas permitir el acceso a la galería. Actívalo en los Ajustes del dispositivo.",
            confirmText: "Abrir Ajustes",
            onConfirm: () => {
              Linking.openSettings().catch((e) =>
                log.warn("No se pudo abrir Ajustes:", e),
              );
            },
          });
        } else {
          showModal({
            title: "Permiso denegado",
            message: "Necesitamos acceso a tu galería para continuar.",
            confirmText: "OK",
          });
        }
        return false;
      }

      // 3) Bloqueado permanentemente → guiar a Ajustes.
      showModal({
        title: "Permiso de galería",
        message:
          "El acceso a la galería está bloqueado. Actívalo en los Ajustes del dispositivo para poder elegir fotos.",
        confirmText: "Abrir Ajustes",
        onConfirm: () => {
          Linking.openSettings().catch((e) =>
            log.warn("No se pudo abrir Ajustes:", e),
          );
        },
      });
      return false;
    } catch (error) {
      log.warn("Error verificando permiso de galería:", error);
      showModal({
        title: "Permiso de galería",
        message: "No se pudo verificar el acceso a la galería.",
        confirmText: "OK",
      });
      return false;
    }
  }, [showModal]);

  return { ensurePermission };
}