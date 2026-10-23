import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { LegalDocumentsModal } from "@/components/legal/LegalDocumentsModal";
import { legalService, LegalCodigo } from "@/services/legalService";

/**
 * Casillas legales del registro (correo y Google).
 * - Todas inician SIN marcar; las 3 primeras son obligatorias; marketing es opcional y separada.
 * - El documento se lee en un popup dentro de la app. El texto sale de la BD (misma versión que
 *   queda registrada como evidencia al crear la cuenta; ver legal_consentimientos).
 */
interface LegalCheckboxItem {
  key: "acceptedTerms" | "acceptedPrivacy" | "acceptedAge" | "acceptedMarketing";
  label: string;
  required: boolean;
  /** Documento que se abre con "Leer documento completo". */
  codigo?: LegalCodigo;
  /** Texto del enlace (por defecto "Leer documento completo"). */
  linkLabel?: string;
}

const LEGAL_ITEMS: LegalCheckboxItem[] = [
  {
    key: "acceptedTerms",
    label: "Acepto los Términos y Condiciones de ILYROX",
    required: true,
    codigo: "terminos",
  },
  {
    key: "acceptedPrivacy",
    label: "He leído la Política de Privacidad",
    required: true,
    codigo: "privacidad",
  },
  {
    key: "acceptedAge",
    label: "Confirmo que tengo 18 años o más",
    required: true,
    codigo: "terminos",
    linkLabel: "Ver elegibilidad en los Términos",
  },
  {
    key: "acceptedMarketing",
    label: "Deseo recibir comunicaciones comerciales y promocionales",
    required: false,
    codigo: "comunicaciones",
    linkLabel: "Leer la autorización de contacto",
  },
];

export function LegalAcceptanceSection({
  formState,
  onUpdateField,
}: {
  formState: {
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    acceptedAge: boolean;
    acceptedMarketing: boolean;
  };
  onUpdateField: <K extends keyof typeof formState>(
    field: K,
    value: typeof formState[K]
  ) => void;
}) {
  // undefined = popup cerrado; null = lista de documentos; código = ese documento
  const [openDoc, setOpenDoc] = useState<LegalCodigo | null | undefined>(undefined);

  // Precarga las versiones vigentes: quedan en el contexto de la evidencia ("versiones mostradas").
  useEffect(() => {
    legalService.listarDocumentos().catch(() => {});
  }, []);

  const handleToggle = (key: LegalCheckboxItem["key"]) => {
    const currentValue = formState[key];
    onUpdateField(key, !currentValue);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        Aceptaciones y confirmaciones <Text style={styles.required}>*</Text>
      </Text>

      <Text style={styles.sectionSubtitle}>
        Por favor lee cada documento antes de aceptar. Los marcados con * son obligatorios.
      </Text>

      {LEGAL_ITEMS.map((item) => (
        <View key={item.key} style={styles.itemContainer}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => handleToggle(item.key)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: formState[item.key] }}
            accessibilityLabel={
              `${item.label} ${item.required ? "obligatorio" : "opcional"}`
            }
          >
            <View
              style={[
                styles.checkbox,
                formState[item.key] && styles.checkboxChecked,
              ]}
            >
              {formState[item.key] && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color={COLORS.white}
                  style={styles.checkIcon}
                />
              )}
            </View>

            <View style={[styles.labelContainer, { flex: 1 }]}>
              <Text
                style={[
                  styles.label,
                  item.required && styles.labelRequired,
                ]}
                numberOfLines={2}
              >
                {item.label} {item.required && <Text style={styles.asterisk}>*</Text>}
              </Text>
              {item.codigo ? (
                <TouchableOpacity
                  onPress={() => setOpenDoc(item.codigo!)}
                  style={styles.readLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.readLinkText}>
                    <Ionicons
                      name="document-text-outline"
                      size={13}
                      color={COLORS.primary}
                      style={{ marginRight: 4 }}
                    />
                    {item.linkLabel ?? "Leer documento completo"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.noteText}>
        También aplican las Normas de la Comunidad y los Estándares de Seguridad Infantil.{" "}
        <Text style={styles.allDocsLink} onPress={() => setOpenDoc(null)}>
          Ver todos los documentos
        </Text>
      </Text>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Tu nombre, ocupación, foto de perfil, biografía, estado y reseñas serán visibles públicamente.
          Tu email, teléfono, dirección exacta y datos fiscales NUNCA se publican.
        </Text>
      </View>

      <LegalDocumentsModal
        visible={openDoc !== undefined}
        initialCodigo={openDoc ?? null}
        onClose={() => setOpenDoc(undefined)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  required: {
    color: COLORS.error,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 17,
  },
  itemContainer: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkIcon: {
    marginTop: -1,
  },
  labelContainer: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    flex: 1,
  },
  labelRequired: {
    fontWeight: "600",
  },
  asterisk: {
    color: COLORS.error,
    marginLeft: 2,
  },
  readLink: {
    paddingTop: 2,
  },
  readLinkText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
    flexDirection: "row",
    alignItems: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.primaryTransparent,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  noteText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  allDocsLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
