// ============================================
// ProgressModal - Modal de progreso mejorado con etapas y cancelación
// ============================================

import React from "react";
import {
  View,
  Text,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../constants/colors";
import type { PublishState } from "./types";

interface ProgressModalProps {
  publishState: PublishState;
  onCancel: () => void;
  onCloseError?: () => void;
}

export function ProgressModal({ publishState, onCancel, onCloseError }: ProgressModalProps) {
  const { uploading, uploadProgress, uploadStage, error, canCancel } =
    publishState;

  if (!uploading && !error) return null;

  return (
    <Modal visible={uploading || !!error} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          {error ? (
            // Estado de error
            <>
              <View style={styles.errorIcon}>
                <Ionicons name="alert-circle" size={48} color={COLORS.error} />
              </View>
              <Text style={styles.errorTitle}>Error</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              {onCloseError && (
                <TouchableOpacity
                  style={styles.closeErrorButton}
                  onPress={onCloseError}
                >
                  <Text style={styles.closeErrorText}>Cerrar</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            // Estado de progreso
            <>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.title}>
                {uploadProgress >= 100
                  ? "¡Completado!"
                  : "Publicando propiedad..."}
              </Text>

              {/* Barra de progreso */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(uploadProgress, 100)}%`,
                      backgroundColor:
                        uploadProgress >= 100
                          ? COLORS.success || "#4CAF50"
                          : COLORS.primary,
                    },
                  ]}
                />
              </View>

              <Text style={styles.progressText}>
                {uploadProgress}% completado
              </Text>
              {uploadStage ? (
                <Text style={styles.stageText}>{uploadStage}</Text>
              ) : null}

              {/* Botón cancelar */}
              {canCancel && uploadProgress < 100 && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              )}

              {!canCancel && uploadProgress < 100 && (
                <Text style={styles.noCancelText}>
                  Guardando... no se puede cancelar
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    minWidth: 300,
    maxWidth: "85%",
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 16,
    textAlign: "center",
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: COLORS.cardBorder || "#E0E0E0",
    borderRadius: 4,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  stageText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  cancelText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: "600",
  },
  noCancelText: {
    marginTop: 16,
    fontSize: 12,
    color: COLORS.textTertiary,
    fontStyle: "italic",
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.error,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  closeErrorButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    marginTop: 8,
  },
  closeErrorText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "bold",
  },
});
