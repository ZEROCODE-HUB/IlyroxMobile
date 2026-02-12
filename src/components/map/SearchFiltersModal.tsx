import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RadioGroupSelector from "../common/RadioGroupSelector";

import NumberInputModal from "../modals/NumberInputModal";
import { PropertyTypeSelector } from "./PropertyTypeSelector";
import { SaveSearchModal } from "./SaveSearchModal";
import { PriceSection } from "./filters/PriceSection";
import { CharacteristicsSection } from "./filters/CharacteristicsSection";

import { COLORS } from "../../constants/colors";
import { getCamposVisibles } from "../../constants/propertyData";
import { KeyboardAvoidingView } from "react-native";

const { height } = Dimensions.get("window");

interface SearchFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filters: any;
  onUpdateFilter: (key: string, value: any) => void;
  onUpdateLocationFilter: (location: any) => void;
  filteredPropertiesCount: number;
  userId?: string;
}

export const SearchFiltersModal: React.FC<SearchFiltersModalProps> = ({
  visible,
  onClose,
  filters,
  onUpdateFilter,
  onUpdateLocationFilter,
  filteredPropertiesCount,
  userId,
}) => {
  // Estados para modals
  const [showRecamarasModal, setShowRecamarasModal] = useState(false);
  const [showBanosModal, setShowBanosModal] = useState(false);
  const [showEstacionamientosModal, setShowEstacionamientosModal] =
    useState(false);
  const [showNivelesModal, setShowNivelesModal] = useState(false);
  const [showAntiguedadModal, setShowAntiguedadModal] = useState(false);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);

  // Number Input Modal
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberInputConfig, setNumberInputConfig] = useState({
    title: "",
    onSave: (val: string) => { },
  });


  const openNumberInput = (title: string, onSave: (val: string) => void) => {
    setNumberInputConfig({ title, onSave });
    setShowNumberInput(true);
  };

  const camposVisibles = filters.tipoPropiedad
    ? getCamposVisibles(filters.subtipo)
    : {
      recamaras: false,
      banos: false,
      estacionamientos: false,
      niveles: false,
      antiguedad: false,
      m2Terreno: false,
      m2Construccion: false,
    };

  const handleCurrencyChange = (
    text: string,
    setter: (val: string) => void,
  ) => {
    // Eliminar comas para obtener el valor numérico crudo
    const rawValue = text.replace(/,/g, "");

    // Validar formato numérico (acepta decimales)
    if (/^\d*\.?\d*$/.test(rawValue)) {
      const parts = rawValue.split(".");
      // Formatear parte entera con comas
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      setter(parts.join("."));
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Filtros de Búsqueda</Text>
              <Text style={styles.modalSubtitle}>
                Ajusta los criterios para encontrar tu propiedad
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.modalScroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            {/* 1. TIPO DE OPERACIÓN */}
            <View style={styles.formSection}>
              <RadioGroupSelector
                label="Tipo de Operación"
                options={["Todas", "Venta", "Renta"]}
                selectedValue={
                  !filters.operacion || filters.operacion === ""
                    ? "Todas"
                    : filters.operacion.charAt(0).toUpperCase() +
                    filters.operacion.slice(1)
                }
                onSelect={(val) => {
                  if (val === "Todas") {
                    onUpdateFilter("operacion", "");
                  } else {
                    onUpdateFilter(
                      "operacion",
                      val.toLowerCase() as "venta" | "renta",
                    );
                  }
                }}
              />
            </View>

            {/* 2. PRECIO Y DIVISA */}
            <PriceSection
              filters={filters}
              onUpdateFilter={onUpdateFilter}
              handleCurrencyChange={handleCurrencyChange}
            />



            {/* 4. TIPO DE PROPIEDAD */}
            <View style={styles.formSection}>
              <PropertyTypeSelector
                tipoPropiedad={filters.tipoPropiedad}
                subtipo={filters.subtipo}
                onChangeTipo={(tipo) => onUpdateFilter("tipoPropiedad", tipo)}
                onChangeSubtipo={(subtipo) =>
                  onUpdateFilter("subtipo", subtipo)
                }
              />
            </View>

            {/* 5. CARACTERÍSTICAS */}
            <CharacteristicsSection
              filters={filters}
              camposVisibles={camposVisibles}
              onUpdateFilter={onUpdateFilter}
              showRecamarasModal={showRecamarasModal}
              setShowRecamarasModal={setShowRecamarasModal}
              showBanosModal={showBanosModal}
              setShowBanosModal={setShowBanosModal}
              showEstacionamientosModal={showEstacionamientosModal}
              setShowEstacionamientosModal={setShowEstacionamientosModal}
              showNivelesModal={showNivelesModal}
              setShowNivelesModal={setShowNivelesModal}
              showAntiguedadModal={showAntiguedadModal}
              setShowAntiguedadModal={setShowAntiguedadModal}
              openNumberInput={openNumberInput}
              setShowNumberInput={setShowNumberInput}
            />

            <View style={styles.divider} />


          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyBtn} onPress={onClose}>
              <Text style={styles.applyBtnText}>
                Ver {filteredPropertiesCount} propiedades
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveSearchBtn} 
              onPress={() => setShowSaveSearchModal(true)}
            >
              <Ionicons
                name="bookmark-outline"
                size={18}
                color={COLORS.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.saveSearchBtnText}>Guardar búsqueda</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Number Input Modal */}
      <NumberInputModal
        visible={showNumberInput}
        onClose={() => setShowNumberInput(false)}
        onSave={numberInputConfig.onSave}
        title={numberInputConfig.title}
      />

      {/* Save Search Modal */}
      <SaveSearchModal
        visible={showSaveSearchModal}
        onClose={() => setShowSaveSearchModal(false)}
        onSaveSuccess={() => {
          setShowSaveSearchModal(false);
          onClose();
        }}
        filters={filters}
        userId={userId}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.blackTransparent50,
    justifyContent: "flex-end",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.blackTransparent50,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.85,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 140 : 100,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  currencyToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 2,
  },
  currencyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currencyBtnActive: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },
  currencyTextActive: {
    color: COLORS.primary,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  halfWidth: {
    flex: 1,
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
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    backgroundColor: COLORS.white,
    paddingBottom: Platform.OS === "ios" ? 140 : 50,
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  applyBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  footerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  secondaryBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  saveSearchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    marginTop: 12,
  },
  saveSearchBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 24,
  },
});
