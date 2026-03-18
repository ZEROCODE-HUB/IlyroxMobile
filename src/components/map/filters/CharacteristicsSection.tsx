import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "@/design-system/components/AppInput";
import { SelectionMoreModal } from "@/components/modals/SelectionMoreModal";
import { COLORS } from "@/constants/colors";
import { TipoPrincipal, getLabelRecamaras } from "@/constants/propertyData";
import { SelectionModal } from "@/components/modals";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";

interface CharacteristicsSectionProps {
  camposVisibles: any;
  showRecamarasModal: boolean;
  setShowRecamarasModal: (show: boolean) => void;
  showBanosModal: boolean;
  setShowBanosModal: (show: boolean) => void;
  showEstacionamientosModal: boolean;
  setShowEstacionamientosModal: (show: boolean) => void;
  showNivelesModal: boolean;
  setShowNivelesModal: (show: boolean) => void;
  showAntiguedadModal: boolean;
  setShowAntiguedadModal: (show: boolean) => void;
  openNumberInput: (title: string, onSave: (val: string) => void) => void;
  setShowNumberInput: (show: boolean) => void;
}

export const CharacteristicsSection: React.FC<CharacteristicsSectionProps> = ({
  camposVisibles,
  showRecamarasModal,
  setShowRecamarasModal,
  showBanosModal,
  setShowBanosModal,
  showEstacionamientosModal,
  setShowEstacionamientosModal,
  showNivelesModal,
  setShowNivelesModal,
  showAntiguedadModal,
  setShowAntiguedadModal,
  openNumberInput,
  setShowNumberInput,
}) => {
  const { filters, updateFilter: onUpdateFilter } = usePropertyFiltersStore();

  if (!filters.tipoPropiedad) return null;

  return (
    <View style={styles.formSection}>
      <Text style={styles.sectionLabel}>Características</Text>

      {/* Recámaras */}
      {camposVisibles.recamaras && (
        <>
          <Text style={styles.label}>
            {getLabelRecamaras(filters.tipoPropiedad as TipoPrincipal)}
          </Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowRecamarasModal(true)}
          >
            <Text style={styles.selectorText}>
              {filters.habitaciones || "Cualquiera"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>
          <SelectionMoreModal
            visible={showRecamarasModal}
            onClose={() => setShowRecamarasModal(false)}
            onSelect={(val) => {
              onUpdateFilter("habitaciones", val);
            }}
            title={getLabelRecamaras(filters.tipoPropiedad as TipoPrincipal)}
            currentValue={filters.habitaciones}
          />
        </>
      )}

      {/* Baños */}
      {camposVisibles.banos && (
        <>
          <Text style={[styles.label, { marginTop: 12 }]}>Baños</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowBanosModal(true)}
          >
            <Text style={styles.selectorText}>
              {filters.banos || "Cualquiera"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>
          <SelectionMoreModal
            visible={showBanosModal}
            onClose={() => setShowBanosModal(false)}
            onSelect={(val) => {
              onUpdateFilter("banos", val);
            }}
            title="Baños"
            currentValue={filters.banos}
          />
        </>
      )}

      {/* Estacionamientos */}
      {camposVisibles.estacionamientos && (
        <>
          <Text style={[styles.label, { marginTop: 12 }]}>
            Estacionamientos
          </Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowEstacionamientosModal(true)}
          >
            <Text style={styles.selectorText}>
              {filters.estacionamientos || "Cualquiera"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>
          <SelectionMoreModal
            visible={showEstacionamientosModal}
            onClose={() => setShowEstacionamientosModal(false)}
            onSelect={(val) => {
              onUpdateFilter("estacionamientos", val);
            }}
            title="Estacionamientos"
            currentValue={filters.estacionamientos}
          />
        </>
      )}

      {/* Niveles */}
      {camposVisibles.niveles && (
        <>
          <Text style={[styles.label, { marginTop: 12 }]}>Niveles</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowNivelesModal(true)}
          >
            <Text style={styles.selectorText}>
              {filters.niveles || "Cualquiera"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>
          <SelectionMoreModal
            visible={showNivelesModal}
            onClose={() => setShowNivelesModal(false)}
            onSelect={(val) => {
              onUpdateFilter("niveles", val);
            }}
            title="Niveles"
            currentValue={filters.niveles}
          />
        </>
      )}

      {/* Antigüedad */}
      {camposVisibles.antiguedad && (
        <>
          <Text style={[styles.label, { marginTop: 12 }]}>Antigüedad</Text>
          <TouchableOpacity
            style={styles.selector}
            onPress={() => setShowAntiguedadModal(true)}
          >
            <Text style={styles.selectorText}>
              {filters.antiguedad || "Cualquiera"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>
          <SelectionModal
            visible={showAntiguedadModal}
            onClose={() => setShowAntiguedadModal(false)}
            onSelect={(val) => {
              if (val === "Más de 50" || val.includes("Más")) {
                setShowAntiguedadModal(false);
                openNumberInput("Antigüedad", (value) => {
                  onUpdateFilter("antiguedad", value);
                  setShowNumberInput(false);
                });
              } else {
                onUpdateFilter("antiguedad", val);
              }
            }}
            title="Antigüedad"
            options={[
              "No indicado",
              "0 (Nueva)",
              "1-5",
              "6-10",
              "11-20",
              "21-50",
              "Más de 50",
            ]}
            currentValue={filters.antiguedad}
          />
        </>
      )}

      {/* Superficies */}
      <View style={[styles.row, { marginTop: 12 }]}>
        {camposVisibles.m2Terreno && (
          <View style={styles.halfWidth}>
            <Text style={styles.label}>m² Terreno Mín.</Text>
            <AppInput
              value={filters.m2TerrenoMin}
              onChangeText={(val) => onUpdateFilter("m2TerrenoMin", val)}
              keyboardType="numeric"
              placeholder="Mínimo"
            />
          </View>
        )}
        {camposVisibles.m2Construccion && (
          <View style={styles.halfWidth}>
            <Text style={styles.label}>m² Constr. Mín.</Text>
            <AppInput
              value={filters.m2ConstruccionMin}
              onChangeText={(val) => onUpdateFilter("m2ConstruccionMin", val)}
              keyboardType="numeric"
              placeholder="Mínimo"
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
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
  row: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  halfWidth: {
    flex: 1,
  },
});
