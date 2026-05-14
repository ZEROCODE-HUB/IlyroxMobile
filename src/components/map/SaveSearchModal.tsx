import React, { useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "@/design-system/components/AppInput";
import { useSaveSearch } from "./filters/useSaveSearch";
import { COLORS } from "@/constants/colors";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";

interface SaveSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveSuccessWithData: (metadata?: any) => void;
  userId?: string;
}

export const SaveSearchModal: React.FC<SaveSearchModalProps> = ({
  visible,
  onClose,
  onSaveSuccessWithData,
  userId,
}) => {
  const { filters } = usePropertyFiltersStore();
  const {
    setCreateLead,
    leadName,
    setLeadName,
    leadPhone,
    setLeadPhone,
    leadEmail,
    setLeadEmail,
    errors,
    handleSaveSearch,
  } = useSaveSearch(userId);

  // Activar createLead cuando el modal se abre
  useEffect(() => {
    if (visible) {
      setCreateLead(true);
    }
  }, [visible, setCreateLead]);

  const getFilterSummary = () => {
    const parts: string[] = [];
    if (filters.operacion) parts.push(filters.operacion.charAt(0).toUpperCase() + filters.operacion.slice(1));
    if (filters.tipoPropiedad) parts.push(filters.tipoPropiedad.charAt(0).toUpperCase() + filters.tipoPropiedad.slice(1));
    if (filters.subtipo?.length > 0) parts.push(filters.subtipo.join(", "));

    const loc = filters.locationFilter;
    if (loc?.ciudad) parts.push(loc.ciudad);
    if (loc?.municipio && loc.municipio !== loc.ciudad) parts.push(loc.municipio);
    if (loc?.colonia) {
      if (Array.isArray(loc.colonia) && loc.colonia.length > 0) {
        parts.push(loc.colonia.join(", "));
      } else if (typeof loc.colonia === "string" && loc.colonia.trim()) {
        parts.push(loc.colonia);
      }
    }

    // Location chips (zonas nombradas)
    if (filters.locationChips?.length > 0) {
      parts.push(filters.locationChips.map((c: any) => c.label).join(", "));
    }

    if (filters.precioMin || filters.precioMax) {
      parts.push(`${filters.moneda} ${filters.precioMin || "0"} – ${filters.precioMax || "Max"}`);
    }

    if (filters.polygons?.length > 0) {
      parts.push(filters.polygons.length === 1 ? "1 zona dibujada" : `${filters.polygons.length} zonas dibujadas`);
    }

    if (filters.comisionVentaMin) parts.push(`Comisión venta ≥ ${filters.comisionVentaMin}%`);
    if (filters.comisionRentaMin) parts.push(`Comisión renta ≥ ${filters.comisionRentaMin} meses`);

    // Filtros especializados — resumen breve
    const cf = filters.comercialFilters;
    const inf = filters.industrialFilters;
    const ag = filters.agricolaFilters;
    if (cf?.tipoUbicacion) parts.push(cf.tipoUbicacion);
    if (inf?.ubicacion) parts.push(inf.ubicacion);
    if (inf?.alturaLibre) parts.push(`Altura: ${inf.alturaLibre}`);
    if (ag?.usoTerreno) parts.push(`Uso: ${ag.usoTerreno}`);

    return parts.length > 0 ? parts.join(" • ") : "Búsqueda general";
  };

  const handleSave = async () => {
    const result = await handleSaveSearch(filters, onClose);
    if (result.success) {
      onSaveSuccessWithData(result.metadata);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.title}>Avísame si encuentras algo</Text>
              <Text style={styles.subtitle}>
                Convierte estos filtros en una oportunidad de negocio
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Resumen de Búsqueda */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons
                  name="options-outline"
                  size={14}
                  color={COLORS.textTertiary}
                />
                <Text style={styles.summaryTitle}>Resumen de búsqueda</Text>
              </View>
              <Text style={styles.summaryText}>{getFilterSummary()}</Text>
              <Text style={styles.summaryAction}>
                Los filtros aplicados se asociarán a este prospecto
              </Text>
            </View>

            <View style={styles.formInfo}>
              <Ionicons
                name="person-add-outline"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.formInfoText}>Datos del Prospecto</Text>
            </View>

            <View style={styles.formGrid}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre completo *</Text>
                <AppInput
                  value={leadName}
                  onChangeText={setLeadName}
                  placeholder="Ej. Juan Pérez"
                  containerStyle={
                    errors.leadName ? styles.inputError : undefined
                  }
                  leftIcon={
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={COLORS.textTertiary}
                    />
                  }
                />
                {errors.leadName && (
                  <Text style={styles.errorText}>{errors.leadName}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Teléfono *</Text>
                <AppInput
                  value={leadPhone}
                  onChangeText={setLeadPhone}
                  keyboardType="phone-pad"
                  placeholder="10 dígitos"
                  containerStyle={
                    errors.leadPhone ? styles.inputError : undefined
                  }
                  leftIcon={
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color={COLORS.textTertiary}
                    />
                  }
                />
                {errors.leadPhone && (
                  <Text style={styles.errorText}>{errors.leadPhone}</Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email (opcional)</Text>
                <AppInput
                  value={leadEmail}
                  onChangeText={setLeadEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="correo@ejemplo.com"
                  containerStyle={
                    errors.leadEmail ? styles.inputError : undefined
                  }
                  leftIcon={
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={COLORS.textTertiary}
                    />
                  }
                />
                {errors.leadEmail && (
                  <Text style={styles.errorText}>{errors.leadEmail}</Text>
                )}
              </View>
            </View>

            <View style={styles.warningBox}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.warningText}>
                Se creará un Prospecto y un Post de búsqueda en el feed.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Ionicons
                name="save-outline"
                size={20}
                color={COLORS.white}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.saveButtonText}>Avísame si encuentras algo</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: "100%",
    maxWidth: 500,
    height: "80%", // Cambiado de maxHeight a height
    overflow: "hidden", // Importante para el borderRadius
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: COLORS.background,
    padding: 12,
    margin: 20,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary + "20",
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  summaryAction: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontStyle: "italic",
  },
  formInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  formInfoText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
  formGrid: {
    gap: 12,
    paddingHorizontal: 20,
  },
  formGroup: {
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 4,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: 20,
    marginTop: 16,
    padding: 10,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    gap: 6,
  },
  warningText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
  },
});
