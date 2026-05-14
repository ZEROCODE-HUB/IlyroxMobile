// ============================================
// OwnerSection - Datos del Propietario
// ============================================

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import { COLORS } from "../../../constants/colors";
import { usePropertyFormContext } from "./PropertyFormContext";

export const OwnerSection = React.memo(function OwnerSection() {
  const {
    nombreCompletoPropietario,
    setNombreCompletoPropietario,
    emailPropietario,
    setEmailPropietario,
    telefonoPropietario,
    setTelefonoPropietario,
  } = usePropertyFormContext();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderBand}>
        <Ionicons name="person-outline" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitleBand}>Propietario (Opcional)</Text>
      </View>

      <View>
        <Text style={styles.hint}>
          Esta información es para tu control interno y no será pública.
        </Text>
        <AppInput
          label="Nombre del Propietario"
          placeholder="Ej. Juan Pérez"
          value={nombreCompletoPropietario}
          onChangeText={setNombreCompletoPropietario}
        />
        <AppInput
          label="Email del Propietario"
          placeholder="ejemplo@correo.com"
          value={emailPropietario}
          onChangeText={setEmailPropietario}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <AppInput
          label="Teléfono del Propietario"
          placeholder="Ej. 5512345678"
          value={telefonoPropietario}
          onChangeText={setTelefonoPropietario}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary + "12",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  sectionTitleBand: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 12,
  },
});
