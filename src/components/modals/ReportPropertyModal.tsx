/**
 * ReportPropertyModal.tsx
 * Modal para reportar una propiedad con motivo y descripción.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReportProperty } from "@/hooks/hooks/useReportProperty";

interface ReportPropertyModalProps {
  visible: boolean;
  onClose: () => void;
  propiedadId: string;
  reportadoPorId: string;
  propietarioId: string;
  onSuccess?: () => void;
}

const MOTIVOS = [
  "Información falsa",
  "Spam / Publicidad engañosa",
  "Propiedad ya vendida o rentada",
  "Estafa o fraude",
  "Inapropiado / Ofensivo",
  "Otro",
];

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ReportPropertyModal({
  visible,
  onClose,
  propiedadId,
  reportadoPorId,
  propietarioId,
  onSuccess,
}: ReportPropertyModalProps) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<"list" | "create">("list");
  const [motivo, setMotivo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const { reportProperty, getReportsByProperty, loading } = useReportProperty();

  React.useEffect(() => {
    if (visible && propiedadId) {
      loadReports();
      setView("list");
    }
  }, [visible, propiedadId]);

  const loadReports = async () => {
    setLoadingReports(true);
    const data = await getReportsByProperty(propiedadId);
    setReports(data || []);
    setLoadingReports(false);
  };

  const handleSendReport = async () => {
    if (!motivo) {
      alert("Por favor selecciona un motivo.");
      return;
    }

    if (!propietarioId) {
      alert("No se pudo identificar al propietario de esta propiedad.");
      return;
    }

    const success = await reportProperty({
      propiedad_id: propiedadId,
      reportado_por: reportadoPorId,
      propietario_id: propietarioId,
      motivo,
      descripcion,
      estado: "pendiente",
    });

    if (success) {
      if (onSuccess) onSuccess();
      setMotivo("");
      setDescripcion("");
      await loadReports();
      setView("list");
    }
  };

  const hasUserReported = reports.some(
    (r) => r.reportado_por === reportadoPorId,
  );

  const renderListView = () => (
    <View style={styles.contentContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loadingReports ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Cargando reportes...</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={56}
                color={COLORS.textTertiary}
              />
            </View>
            <Text style={styles.emptyTitle}>Sin reportes</Text>
            <Text style={styles.emptyText}>
              Esta propiedad no tiene reportes registrados.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {reports.length} {reports.length === 1 ? "reporte" : "reportes"}{" "}
              registrados
            </Text>
            {reports.map((report, index) => (
              <View key={index} style={styles.reportCard}>
                <View style={styles.reportCardHeader}>
                  <View style={styles.reportIconContainer}>
                    <Ionicons name="flag" size={16} color={COLORS.error} />
                  </View>
                  <View style={styles.reportCardInfo}>
                    <Text style={styles.reportMotivo}>{report.motivo}</Text>
                    <Text style={styles.reportDate}>
                      {new Date(report.created_at).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      report.estado === "resuelto"
                        ? styles.statusResolved
                        : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        report.estado === "resuelto"
                          ? styles.statusTextResolved
                          : styles.statusTextPending,
                      ]}
                    >
                      {report.estado}
                    </Text>
                  </View>
                </View>
                {report.descripcion && (
                  <Text style={styles.reportDesc} numberOfLines={3}>
                    {report.descripcion}
                  </Text>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Footer fijo */}
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        {hasUserReported ? (
          <View style={styles.alreadyReportedBanner}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={COLORS.primary}
            />
            <Text style={styles.alreadyReportedText}>
              Ya enviaste un reporte para esta propiedad
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setView("create")}
            activeOpacity={0.8}
          >
            <Ionicons name="flag-outline" size={20} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Crear nuevo reporte</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCreateView = () => (
    <View style={styles.contentContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.formScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Botón volver */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setView("list")}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>

          {/* Selección de motivo */}
          <Text style={styles.formLabel}>
            Descripción adicional
            <Text style={styles.optionalLabel}> (opcional)</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Cuéntanos más detalles sobre el problema..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={4}
            value={descripcion}
            onChangeText={setDescripcion}
            textAlignVertical="top"
          />

          <Text style={styles.formLabel}>¿Cuál es el motivo del reporte?</Text>
          <View style={styles.motivosGrid}>
            {MOTIVOS.map((item) => {
              const isSelected = motivo === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.motivoChip,
                    isSelected && styles.motivoChipSelected,
                  ]}
                  onPress={() => setMotivo(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={isSelected ? COLORS.primary : COLORS.textTertiary}
                  />
                  <Text
                    style={[
                      styles.motivoChipText,
                      isSelected && styles.motivoChipTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Descripción */}
        </ScrollView>

        {/* Footer con botón enviar */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!motivo || loading) && styles.submitButtonDisabled,
            ]}
            onPress={handleSendReport}
            disabled={loading || !motivo}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Ionicons name="send" size={18} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Enviar reporte</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayBackground}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalContainer, { paddingTop: 8 }]}>
          {/* Handle indicator */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Ionicons
                name={view === "list" ? "flag" : "create"}
                size={22}
                color={COLORS.error}
              />
              <Text style={styles.headerTitle}>
                {view === "list" ? "Reportes" : "Nuevo reporte"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Contenido */}
          {view === "list" ? renderListView() : renderCreateView()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.75,
    overflow: "hidden",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  contentContainer: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 8,
  },
  formScrollContent: {
    padding: 20,
    paddingBottom: 8,
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: "center",
  },

  // Section Title
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  // Report Cards
  reportCard: {
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  reportCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  reportIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  reportCardInfo: {
    flex: 1,
  },
  reportMotivo: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  reportDate: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusResolved: {
    backgroundColor: "#D1FAE5",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusTextPending: {
    color: "#D97706",
  },
  statusTextResolved: {
    color: "#059669",
  },
  reportDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 10,
    lineHeight: 18,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: COLORS.white,
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  alreadyReportedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0F2FE",
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  alreadyReportedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.primary,
  },

  // Back Button
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
    gap: 4,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // Form
  formLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  optionalLabel: {
    fontWeight: "400",
    color: COLORS.textTertiary,
  },
  motivosGrid: {
    gap: 8,
    marginBottom: 24,
  },
  motivoChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    backgroundColor: COLORS.white,
    gap: 10,
  },
  motivoChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#F0FDFA",
  },
  motivoChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  motivoChipTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  textArea: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    textAlignVertical: "top",
    marginBottom: 10,
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: COLORS.error,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
