// ============================================
// PropertyPrivateOwner
// Datos del propietario visibles SOLO para el creador de la propiedad.
// Incluye una nota que aclara que la información es privada.
// ============================================

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants";

export interface PropertyPrivateOwnerProps {
  isCreator: boolean;
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
}

interface OwnerRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}

const OwnerRow = ({ icon, label, value, onPress }: OwnerRowProps) => {
  const content = (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, onPress && styles.rowValueLink]}>{value}</Text>
      </View>
      {onPress && (
        <Ionicons name="open-outline" size={16} color={COLORS.primary} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

export const PropertyPrivateOwner: React.FC<PropertyPrivateOwnerProps> = ({
  isCreator,
  nombre,
  email,
  telefono,
}) => {
  const nombreV = nombre?.trim();
  const emailV = email?.trim();
  const telefonoV = telefono?.trim();

  // Solo el creador puede ver estos datos, y solo si hay al menos uno.
  if (!isCreator) return null;
  if (!nombreV && !emailV && !telefonoV) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Ionicons name="person-outline" size={18} color={COLORS.primary} />
        <Text style={styles.title}>Datos del propietario</Text>
      </View>

      <View style={styles.noteBox}>
        <Ionicons name="lock-closed-outline" size={16} color={COLORS.infoDark} />
        <Text style={styles.noteText}>
          Solo tú puedes ver esta información porque eres quien publicó la
          propiedad.
        </Text>
      </View>

      {nombreV ? (
        <OwnerRow icon="person-outline" label="Nombre" value={nombreV} />
      ) : null}
      {telefonoV ? (
        <OwnerRow
          icon="call-outline"
          label="Teléfono"
          value={telefonoV}
          onPress={() =>
            Linking.openURL(`tel:${telefonoV.replace(/\s/g, "")}`)
          }
        />
      ) : null}
      {emailV ? (
        <OwnerRow
          icon="mail-outline"
          label="Email"
          value={emailV}
          onPress={() => Linking.openURL(`mailto:${emailV}`)}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.infoLight,
    borderWidth: 1,
    borderColor: COLORS.info,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.infoDark,
    lineHeight: 17,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  rowValueLink: {
    color: COLORS.primary,
  },
});

export default PropertyPrivateOwner;
