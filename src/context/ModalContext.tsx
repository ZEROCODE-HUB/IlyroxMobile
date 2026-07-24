import React, { createContext, useContext, useState, ReactNode } from "react";
import { ConfirmationModal } from "../components/modals/ConfirmationModal";
import { logger } from "../utils/logger";

const log = logger.scoped("ModalContext");

export type ModalType = "confirm" | "alert";

interface ModalOptions {
    title: string;
    message: string;
    type?: ModalType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => Promise<void> | void;
    onCancel?: () => void;
    loading?: boolean;
    confirmVariant?: "primary" | "danger";
}

interface ModalContextData {
    showModal: (options: ModalOptions) => void;
    hideModal: () => void;
    isLoading: boolean;
    setLoading: (loading: boolean) => void;
}

const ModalContext = createContext<ModalContextData | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
    const [visible, setVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState<ModalOptions | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const showModal = (options: ModalOptions) => {
        setModalConfig(options);
        setVisible(true);
        setIsLoading(false);
    };

    const hideModal = () => {
        setVisible(false);
        // Optionally reset config after a delay to allow animation to finish
        setTimeout(() => {
            setModalConfig(null);
            setIsLoading(false);
        }, 300);
    };

    const handleConfirm = async () => {
        if (modalConfig?.onConfirm) {
            try {
                setIsLoading(true);
                await modalConfig.onConfirm();
            } catch (error) {
                log.error("Modal confirmation error:", error);
            } finally {
                setIsLoading(false);
                hideModal();
            }
        } else {
            hideModal();
        }
    };

    const handleCancel = () => {
        if (modalConfig?.onCancel) {
            modalConfig.onCancel();
        }
        hideModal();
    };

    return (
        <ModalContext.Provider
            value={{ showModal, hideModal, isLoading, setLoading: setIsLoading }}
        >
            {children}
            {modalConfig && (
                <ConfirmationModal
                    visible={visible}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    confirmText={
                        modalConfig.confirmText ||
                        (modalConfig.type === "alert" ? "OK" : "Confirmar")
                    }
                    cancelText={modalConfig.cancelText || "Cancelar"}
                    onConfirm={handleConfirm}
                    // Mostrar "Cancelar" cuando NO es un alert y el que llama
                    // pidió cancelar (pasó onCancel o cancelText). Antes solo
                    // dependía de onCancel, así que un modal con cancelText pero
                    // sin onCancel (p. ej. cerrar sesión) salía sin botón de
                    // cancelar ni forma de cerrarse.
                    onCancel={
                        modalConfig.type !== "alert" &&
                        (modalConfig.onCancel || modalConfig.cancelText)
                            ? handleCancel
                            : undefined
                    }
                    loading={isLoading}
                    confirmVariant={modalConfig.confirmVariant}
                />
            )}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("useModal must be used within a ModalProvider");
    }
    return context;
};
