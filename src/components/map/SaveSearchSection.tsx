import React from "react";
import { View, Text, StyleSheet, Switch, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import { COLORS } from "../../constants/colors";

interface SaveSearchSectionProps {
  createLead: boolean;
  onToggleCreateLead: (value: boolean) => void;
  leadName: string;
  leadPhone: string;
  leadEmail: string;
  onChangeLeadName: (value: string) => void;
  onChangeLeadPhone: (value: string) => void;
  onChangeLeadEmail: (value: string) => void;
  errors?: { [key: string]: string };
  filters: any;
}

export const SaveSearchSection: React.FC<SaveSearchSectionProps> = ({
  createLead,
  onToggleCreateLead,
  leadName,
  leadPhone,
  leadEmail,
  onChangeLeadName,
  onChangeLeadPhone,
  onChangeLeadEmail,
  errors = {},
  filters,
}) => {
  const getFilterSummary = () => {
    const parts = [];
    if (filters.operacion && filters.operacion !== "Todas")
      parts.push(filters.operacion);
    if (filters.tipoPropiedad) parts.push(filters.tipoPropiedad);
    if (filters.subtipo && filters.subtipo !== "Todas")
      parts.push(filters.subtipo);

    const loc = filters.locationFilter;
    if (loc.ciudad && loc.ciudad !== "Cualquiera") parts.push(loc.ciudad);

    if (
      filters.precioMin ||
      (filters.precioMax && filters.precioMax !== "Sin límite")
    ) {
      parts.push(
        `${filters.moneda} ${filters.precioMin || 0}-${filters.precioMax || "Max"}`,
      );
    }

    return parts.length > 0 ? parts.join(" • ") : "Búsqueda general";
  };

  return (
    <View style={styles.container}>
      {/* Header Interactivo */}
      <View style={styles.headerRow}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.sectionTitle}>Guardar esta búsqueda</Text>
          <Text style={styles.sectionSubtitle}>
            Convierte estos filtros en una oportunidad de negocio
          </Text>
        </View>
        <Switch
          value={createLead}
          onValueChange={onToggleCreateLead}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primary + "80" }}
          thumbColor={createLead ? COLORS.primary : COLORS.white}
          ios_backgroundColor={COLORS.cardBorder}
        />
      </View>

      {/* Formulario de prospecto (Inline) */}
      {createLead && (
        <View style={styles.leadForm}>
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
              Puedes ajustar los filtros arriba antes de guardar
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
                onChangeText={onChangeLeadName}
                placeholder="Ej. Juan Pérez"
                containerStyle={errors.leadName ? styles.inputError : undefined}
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

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1.2 }]}>
                <Text style={styles.label}>Teléfono *</Text>
                <AppInput
                  value={leadPhone}
                  onChangeText={onChangeLeadPhone}
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

              <View style={[styles.formGroup, { flex: 1.8 }]}>
                <Text style={styles.label}>Email *</Text>
                <AppInput
                  value={leadEmail}
                  onChangeText={onChangeLeadEmail}
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
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    lineHeight: 18,
  },
  leadForm: {
    marginTop: 12,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 100,
  },
  formInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  formInfoText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
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
  formGrid: {
    gap: 12,
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
    marginTop: 16,
    padding: 10,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    gap: 6,
  },
  warningText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
});
