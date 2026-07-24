import React, { useState, useCallback } from "react";
import { ConfirmationModal } from "@/components/modals/ConfirmationModal";
import { logger } from "@/utils/logger";

const log = logger.scoped("useLocalModal");

export type LocalModalType = "confirm" | "alert";

export interface LocalModalOptions {
  title: string;
  message: string;
  type?: LocalModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => Promise<void> | void;
  onCancel?: () => void;
  confirmVariant?: "primary" | "danger";
}

/**
 * Versión LOCAL de `useModal().showModal` (ModalContext).
 *
 * El `ConfirmationModal` global se monta en la raíz de la app; en iOS un
 * `<Modal>` nativo (pageSheet/fullScreen de edición) lo tapa por completo por la
 * regla de "un solo modal presentado a la vez" (modal-dentro-de-modal), así que
 * los avisos disparados desde una pantalla montada en un `<Modal>` quedan
 * invisibles y el flujo se congela.
 *
 * Este hook renderiza el `ConfirmationModal` como HIJO de la pantalla que lo usa
 * (dentro del mismo `<Modal>` nativo), donde sí es visible. La API de `showModal`
 * es idéntica a la global para que el swap sea mínimo: cambiar el import y montar
 * `{modalElement}` en el árbol de la pantalla.
 */
export function useLocalModal() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<LocalModalOptions | null>(null);
  const [loading, setLoading] = useState(false);

  const showModal = useCallback((options: LocalModalOptions) => {
    setConfig(options);
    setVisible(true);
    setLoading(false);
  }, []);

  const hideModal = useCallback(() => {
    setVisible(false);
    // Limpiar la config tras la animación de salida.
    setTimeout(() => {
      setConfig(null);
      setLoading(false);
    }, 300);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (config?.onConfirm) {
      try {
        setLoading(true);
        await config.onConfirm();
      } catch (error) {
        log.error("Local modal confirmation error:", error);
      } finally {
        setLoading(false);
        hideModal();
      }
    } else {
      hideModal();
    }
  }, [config, hideModal]);

  const handleCancel = useCallback(() => {
    if (config?.onCancel) config.onCancel();
    hideModal();
  }, [config, hideModal]);

  const modalElement = config ? (
    <ConfirmationModal
      visible={visible}
      title={config.title}
      message={config.message}
      confirmText={
        config.confirmText || (config.type === "alert" ? "OK" : "Confirmar")
      }
      cancelText={config.cancelText || "Cancelar"}
      onConfirm={handleConfirm}
      // Mostrar "Cancelar" solo cuando NO es alert y el que llama pidió cancelar
      // (pasó onCancel o cancelText). Misma regla que el ModalContext global.
      onCancel={
        config.type !== "alert" && (config.onCancel || config.cancelText)
          ? handleCancel
          : undefined
      }
      loading={loading}
      confirmVariant={config.confirmVariant}
    />
  ) : null;

  return { showModal, hideModal, modalElement };
}
