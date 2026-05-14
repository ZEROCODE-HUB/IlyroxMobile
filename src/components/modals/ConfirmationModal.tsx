import React from "react";
import { View, StyleSheet } from "react-native";
import { Modal, Button, Typography } from "@/design-system/components";

interface ConfirmationModalProps {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    onConfirm,
    onCancel,
    loading = false,
}) => {
    const handleClose = () => {
        if (loading) return;
        if (onCancel) onCancel();
    };

    return (
        <Modal
            visible={visible}
            onClose={handleClose}
            variant="center"
            showCloseButton={false}
            dismissOnBackdropPress={!loading}
            contentStyle={styles.content}
        >
            <Typography variant="subheading" style={styles.title}>{title}</Typography>
            <Typography variant="body" tone="secondary" style={styles.message}>{message}</Typography>

            <View style={styles.actions}>
                {onCancel && (
                    <Button
                        variant="ghost"
                        label={cancelText}
                        onPress={onCancel}
                        disabled={loading}
                        style={styles.button}
                    />
                )}
                <Button
                    variant={!onCancel ? "primary" : "danger"}
                    label={confirmText}
                    loading={loading}
                    onPress={onConfirm}
                    style={styles.button}
                />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    content: {
        padding: 24,
        maxWidth: 340,
    },
    title: {
        textAlign: "center",
        marginBottom: 8,
    },
    message: {
        textAlign: "center",
        marginBottom: 24,
    },
    actions: {
        flexDirection: "row",
        gap: 12,
    },
    button: {
        flex: 1,
    },
});
