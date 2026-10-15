import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MultiSelectionModal } from "../modals";
import { COLORS } from "../../constants/colors";
import { PROPERTY_TYPES, TipoPrincipal } from "../../constants/propertyData";

interface PropertyTypeSelectorProps {
  tipoPropiedad: string;
  subtipo: string[];
  /**
   * Callback unificado para cambios que afectan tipo + subtipo al mismo tiempo
   * (ej. toggle del chip de tipo). Esto evita renders intermedios con
   * estado inconsistente (tipo="" pero subtipo con valores viejos) que pueden
   * causar crashes en componentes nativos.
   */
  onChangeTipoYSubtipo: (tipo: string, subtipos: string[]) => void;
  /** Solo para cambios de subtipo sin cambiar tipo. */
  onChangeSubtipo: (subtipos: string[]) => void;
}

export const PropertyTypeSelector: React.FC<PropertyTypeSelectorProps> = ({
  tipoPropiedad,
  subtipo,
  onChangeTipoYSubtipo,
  onChangeSubtipo,
}) => {
  const [showSubtipoModal, setShowSubtipoModal] = React.useState(false);

  const tipoProperty = [
    { label: "Habitacional", value: "habitacional" },
    { label: "Comercial", value: "comercial" },
    { label: "Industrial", value: "industrial" },
    { label: "Agropecuario", value: "agricola" },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Tipo de Propiedad</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {tipoProperty.map((tipo) => {
          const isSelected = tipoPropiedad === tipo.value;
          return (
            <TouchableOpacity
              key={tipo.value}
              style={[
                styles.chip,
                isSelected && styles.chipActive,
              ]}
              onPress={() => {
                // Toggle: si ya está seleccionado, deseleccionar (pasar string
                // vacío). Si no, seleccionar este tipo. Al deseleccionar también
                // limpiamos los subtipos porque no aplican sin tipo padre.
                // AMBOS cambios se aplican en un solo set atómico (vía
                // onChangeTipoYSubtipo) para evitar renders intermedios con
                // estado inconsistente (tipo="" pero subtipo con valores
                // viejos) que pueden causar crashes en iOS.
                onChangeTipoYSubtipo(
                  isSelected ? "" : tipo.value,
                  [],
                );
              }}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextActive,
                ]}
              >
                {tipo.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {tipoPropiedad && (
        <>
          <Text style={styles.label}>Subtipo</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowSubtipoModal(true)}
          >
            <Text
              style={
                subtipo && subtipo.length > 0
                  ? styles.selectorText
                  : styles.selectorPlaceholder
              }
            >
              {subtipo && subtipo.length > 0
                ? subtipo.join(", ")
                : "Selecciona uno o más subtipos..."}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>

          <MultiSelectionModal
            visible={showSubtipoModal}
            onClose={() => setShowSubtipoModal(false)}
            onSelect={(vals) => onChangeSubtipo(vals)}
            title={`Subtipos de ${tipoPropiedad}`}
            options={[
              ...(PROPERTY_TYPES[tipoPropiedad as TipoPrincipal] || []),
            ]}
            currentValues={subtipo}
          />
        </>
      )}
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
    color: COLORS.primaryDark,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  chipsContainer: {
    gap: 8,
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  chipActive: {
    backgroundColor: COLORS.primaryTransparent,
    borderColor: COLORS.primaryDark,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontWeight: "500",
  },
  chipTextActive: {
    color: COLORS.primaryDark,
    fontWeight: "600",
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
  },
  selectorText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  selectorPlaceholder: {
    fontSize: 15,
    color: COLORS.textDisabled,
  },
});
