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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/colors";
import { Avatar } from "./shared";
import {
  FeatureRatings,
  RatingTarget,
} from "./Appointments/appointmentTypes";

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (
    featureRatings: FeatureRatings,
    comentario: string,
    recomienda: boolean | null,
  ) => void;
  target?: RatingTarget | null;
}

type FeatureKey = keyof FeatureRatings;

const FEATURES: {
  key: FeatureKey;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "profesionalismo",
    label: "Profesionalismo",
    description: "Conocimiento del mercado, cumplimiento y calidad en su trabajo.",
    icon: "briefcase-outline",
  },
  {
    key: "etica_valores",
    label: "Ética y valores",
    description: "Honestidad, transparencia y respeto en su actuar.",
    icon: "shield-checkmark-outline",
  },
  {
    key: "pago_comisiones",
    label: "Pago de comisiones",
    description: "Cumple en tiempo y forma con los pagos acordados.",
    icon: "cash-outline",
  },
  {
    key: "comunicacion_servicio",
    label: "Comunicación y servicio",
    description: "Comunicación efectiva, atención y disposición para ayudar.",
    icon: "chatbubble-ellipses-outline",
  },
];

const EMPTY_RATINGS: FeatureRatings = {
  profesionalismo: 0,
  etica_valores: 0,
  pago_comisiones: 0,
  comunicacion_servicio: 0,
};

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  onClose,
  onSubmit,
  target,
}) => {
  const [featureRatings, setFeatureRatings] =
    useState<FeatureRatings>(EMPTY_RATINGS);
  const [comentario, setComentario] = useState("");
  const [recomienda, setRecomienda] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset ratings when modal opens
  useEffect(() => {
    if (visible) {
      setFeatureRatings(EMPTY_RATINGS);
      setComentario("");
      setRecomienda(null);
      setSubmitting(false);
    }
  }, [visible]);

  const allRated = FEATURES.every((f) => featureRatings[f.key] > 0);

  const handleSubmit = async () => {
    if (!allRated) return;

    setSubmitting(true);
    try {
      await onSubmit(featureRatings, comentario, recomienda);
    } catch (error) {
      // El error ya fue manejado en el componente padre
    } finally {
      setSubmitting(false);
    }
  };

  const updateFeatureRating = (key: FeatureKey, value: number) => {
    setFeatureRatings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.rateModalCard}>
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Ionicons
                name="chevron-back"
                size={22}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.modalTitle}>Calificar asesor</Text>
              <Text style={styles.modalSubtitle}>
                Tu evaluación ayuda a mantener la calidad en{" "}
                <Text style={styles.brand}>ILYROX</Text>
              </Text>
            </View>
            <View style={styles.headerBtn} />
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Tarjeta del asesor */}
            {target && (
              <View style={styles.advisorCard}>
                <Avatar
                  uri={target.avatar || undefined}
                  name={target.name}
                  size={64}
                />
                <View style={styles.advisorInfo}>
                  <Text style={styles.advisorName} numberOfLines={1}>
                    {target.name}
                  </Text>
                  {target.phone && (
                    <View style={styles.advisorMetaRow}>
                      <Ionicons name="call" size={13} color={COLORS.primary} />
                      <Text style={styles.advisorPhone}>{target.phone}</Text>
                    </View>
                  )}
                  {target.location && (
                    <View style={styles.advisorMetaRow}>
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={COLORS.textTertiary}
                      />
                      <Text style={styles.advisorLocation} numberOfLines={1}>
                        {target.location}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Categorías */}
            <Text style={styles.sectionTitle}>
              Califica las siguientes categorías
            </Text>
            <Text style={styles.sectionSubtitle}>
              Selecciona de 1 a 5 estrellas para cada categoría.
            </Text>

            <View style={styles.featuresCard}>
              {FEATURES.map((feature, idx) => {
                const value = featureRatings[feature.key];
                return (
                  <View
                    key={feature.key}
                    style={[
                      styles.featureRow,
                      idx === FEATURES.length - 1 && styles.featureRowLast,
                    ]}
                  >
                    <View style={styles.featureIconCircle}>
                      <Ionicons
                        name={feature.icon}
                        size={20}
                        color={COLORS.primary}
                      />
                    </View>
                    <View style={styles.featureTextWrap}>
                      <Text style={styles.featureLabel}>{feature.label}</Text>
                      <Text style={styles.featureDesc}>
                        {feature.description}
                      </Text>
                    </View>
                    <View style={styles.featureRightWrap}>
                      <View style={styles.stars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <TouchableOpacity
                            key={s}
                            onPress={() => updateFeatureRating(feature.key, s)}
                            hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                          >
                            <Ionicons
                              name={value >= s ? "star" : "star-outline"}
                              size={20}
                              color={
                                value >= s ? COLORS.warning : COLORS.textDisabled
                              }
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text
                        style={[
                          styles.featureValue,
                          value === 0 && styles.featureValueEmpty,
                        ]}
                      >
                        {value.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* ¿Trabajarías nuevamente? (recomendación) */}
            <View style={styles.recommendCard}>
              <View style={styles.recommendLabelWrap}>
                <Ionicons
                  name="heart-outline"
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.recommendLabel}>
                  ¿Trabajarías nuevamente con este asesor?
                </Text>
              </View>
              <View style={styles.recommendButtons}>
                <TouchableOpacity
                  style={[
                    styles.recommendBtn,
                    recomienda === true && styles.recommendBtnYesActive,
                  ]}
                  onPress={() =>
                    setRecomienda((prev) => (prev === true ? null : true))
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.recommendBtnText,
                      recomienda === true && styles.recommendBtnTextActive,
                    ]}
                  >
                    Sí
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.recommendBtn,
                    styles.recommendBtnNo,
                    recomienda === false && styles.recommendBtnNoActive,
                  ]}
                  onPress={() =>
                    setRecomienda((prev) => (prev === false ? null : false))
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.recommendBtnText,
                      styles.recommendBtnTextNo,
                      recomienda === false && styles.recommendBtnTextActive,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

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

            {/* Publicar */}
            <TouchableOpacity
              onPress={handleSubmit}
              style={[
                styles.publishBtn,
                (!allRated || submitting) && styles.publishBtnDisabled,
              ]}
              disabled={!allRated || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={[styles.publishBtnText, { marginLeft: 8 }]}>
                    Publicando...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color={COLORS.white} />
                  <Text style={styles.publishBtnText}>Publicar evaluación</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Nota al pie */}
            <View style={styles.footerNote}>
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={COLORS.textTertiary}
              />
              <Text style={styles.footerNoteText}>
                En esta versión tu nombre no será visible públicamente.{" "}
                <Text style={styles.footerNoteHighlight}>Próximamente</Text> las
                evaluaciones incluirán el perfil de quien evaluó.
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.blackTransparent60,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  rateModalCard: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    width: "100%",
    maxWidth: 440,
    maxHeight: "92%",
    overflow: "hidden",
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 2,
    paddingHorizontal: 8,
  },
  brand: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  modalContent: {
    paddingHorizontal: 16,
  },
  modalContentInner: {
    paddingBottom: 24,
  },
  // Tarjeta asesor
  advisorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 20,
  },
  advisorInfo: {
    flex: 1,
    gap: 4,
  },
  advisorName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  advisorMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  advisorPhone: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  advisorLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  // Sección categorías
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  featuresCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  featureRowLast: {
    borderBottomWidth: 0,
  },
  featureIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryTransparent,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTextWrap: {
    flex: 1,
  },
  featureLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  featureDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  featureRightWrap: {
    alignItems: "center",
    gap: 4,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
  featureValue: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },
  featureValueEmpty: {
    color: COLORS.textDisabled,
  },
  // Recomendación
  recommendCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    padding: 16,
    marginBottom: 20,
  },
  recommendLabelWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recommendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendButtons: {
    flexDirection: "row",
    gap: 8,
  },
  recommendBtn: {
    minWidth: 64,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  recommendBtnYesActive: {
    backgroundColor: COLORS.primary,
  },
  recommendBtnNo: {
    borderColor: COLORS.cardBorder,
  },
  recommendBtnNoActive: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  recommendBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  recommendBtnTextNo: {
    color: COLORS.textSecondary,
  },
  recommendBtnTextActive: {
    color: COLORS.white,
  },
  // Comentario
  commentSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 90,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: "right",
    marginTop: 4,
  },
  // Publicar
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
  },
  publishBtnDisabled: {
    opacity: 0.5,
  },
  publishBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  // Nota al pie
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  footerNoteHighlight: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
