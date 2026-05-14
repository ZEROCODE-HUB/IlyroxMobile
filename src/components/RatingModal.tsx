import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    overallRating: number,
    featureRatings: FeatureRatings,
    comentario: string
  ) => void;
}

interface FeatureRatings {
  conocimiento_mercado: number;
  comunicacion: number;
  profesionalismo: number;
  disponibilidad: number;
}

const FEATURES = [
  { key: "conocimiento_mercado", label: "Conocimiento del Mercado" },
  { key: "comunicacion", label: "Comunicación" },
  { key: "profesionalismo", label: "Profesionalismo" },
  { key: "disponibilidad", label: "Disponibilidad" },
] as const;

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [overallRating, setOverallRating] = useState(0);
  const [featureRatings, setFeatureRatings] = useState<FeatureRatings>({
    conocimiento_mercado: 0,
    comunicacion: 0,
    profesionalismo: 0,
    disponibilidad: 0,
  });
  const [comentario, setComentario] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset ratings when modal opens
  useEffect(() => {
    if (visible) {
      setOverallRating(0);
      setFeatureRatings({
        conocimiento_mercado: 0,
        comunicacion: 0,
        profesionalismo: 0,
        disponibilidad: 0,
      });
      setComentario("");
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (overallRating === 0) {
      // Podrías mostrar una alerta aquí
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(overallRating, featureRatings, comentario);
    } catch (error) {
      // El error ya fue manejado en el componente padre
    } finally {
      setSubmitting(false);
    }
  };

  const updateFeatureRating = (key: keyof FeatureRatings, value: number) => {
    setFeatureRatings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.rateModalCard}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Calificar Asesor</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalLabel}>Calificación general</Text>
            <View style={styles.starsLarge}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setOverallRating(s)}>
                  <Ionicons
                    name={overallRating >= s ? "star" : "star-outline"}
                    size={32}
                    color={COLORS.warning}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.modalLabel, styles.featuresTitle]}>
              Características
            </Text>
            {FEATURES.map((feature) => (
              <View key={feature.key} style={styles.featureRateRow}>
                <Text style={styles.featureLabel}>{feature.label}</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => updateFeatureRating(feature.key, s)}
                    >
                      <Ionicons
                        name={
                          featureRatings[feature.key] >= s
                            ? "star"
                            : "star-outline"
                        }
                        size={25}
                        color={COLORS.warning}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Comentario opcional */}
            <View style={styles.commentSection}>
              <Text style={styles.modalLabel}>Comentario (opcional)</Text>
              <TextInput
                style={styles.commentInput}
                placeholder="Escribe tus comentarios sobre la experiencia..."
                placeholderTextColor={COLORS.textTertiary}
                value={comentario}
                onChangeText={setComentario}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{comentario.length}/500</Text>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.btnSecondary, submitting && styles.btnDisabled]}
                disabled={submitting}
              >
                <Text style={styles.btnTextSec}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={[styles.btnPrimary, submitting && styles.btnDisabled]}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={[styles.btnTextPri, { marginLeft: 8 }]}>
                      Guardando...
                    </Text>
                  </>
                ) : (
                  <Text style={styles.btnTextPri}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.blackTransparent60,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  rateModalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  modalContent: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  featuresTitle: {
    marginTop: 20,
  },
  starsLarge: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  featureRateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  featureLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
  },
  stars: {
    flexDirection: "row",
    gap: 4,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  btnSecondary: {
    flex: 1,
    padding: 14,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 12,
    alignItems: "center",
  },
  btnPrimary: {
    flex: 1,
    padding: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  btnTextSec: {
    fontWeight: "600",
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  btnTextPri: {
    fontWeight: "600",
    fontSize: 14,
    color: COLORS.white,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  recommendSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  commentSection: {
    marginTop: 16,
  },
  commentInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: "right",
    marginTop: 4,
  },
});
