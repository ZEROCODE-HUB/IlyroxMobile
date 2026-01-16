import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
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
  onSave: () => void;
  errors?: { [key: string]: string };
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
  onSave,
  errors = {},
}) => {
  const isFormValid = createLead
    ? leadName.trim() && leadPhone.trim() && leadEmail.trim()
    : true;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Guardar Búsqueda</Text>
      <Text style={styles.helperText}>
        Guarda esta configuración y crea un prospecto asociado (opcional).
      </Text>

      {/* Switch para guardar búsqueda */}
      <View style={styles.switchRow}>
        <View style={styles.switchLabelContainer}>
          <Text style={styles.switchLabel}>Registrar Prospecto</Text>
          <Text style={styles.switchHelperText}>
            Asociar esta búsqueda a un nuevo prospecto
          </Text>
        </View>
        <Switch
          value={createLead}
          onValueChange={onToggleCreateLead}
          trackColor={{ false: COLORS.cardBorder, true: COLORS.primaryLight }}
          thumbColor={createLead ? COLORS.primary : COLORS.background}
        />
      </View>

      {/* Formulario de prospecto (visible si el switch está activo) */}
      {createLead && (
        <View style={styles.leadForm}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nombre del Prospecto *</Text>
            <AppInput
              value={leadName}
              onChangeText={onChangeLeadName}
              placeholder="Nombre completo"
              style={
                errors.leadName ? { borderColor: COLORS.error } : undefined
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
              onChangeText={onChangeLeadPhone}
              keyboardType="phone-pad"
              placeholder="10 dígitos"
              style={
                errors.leadPhone ? { borderColor: COLORS.error } : undefined
              }
            />
            {errors.leadPhone && (
              <Text style={styles.errorText}>{errors.leadPhone}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email *</Text>
            <AppInput
              value={leadEmail}
              onChangeText={onChangeLeadEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="correo@ejemplo.com"
              style={
                errors.leadEmail ? { borderColor: COLORS.error } : undefined
              }
            />
            {errors.leadEmail && (
              <Text style={styles.errorText}>{errors.leadEmail}</Text>
            )}
          </View>
        </View>
      )}

      {/* Botón de guardar con icono de campana */}
      <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
        <Ionicons
          name={createLead ? "person-add" : "notifications"}
          size={20}
          color={COLORS.white}
        />
        <Text style={styles.saveBtnText}>
          {createLead ? "Guardar Búsqueda + Prospecto" : "Guardar Búsqueda"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginBottom: 16,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  switchHelperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  leadForm: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 4,
  },
});
