import React, { useEffect, useState } from "react";
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
import { usePropertyFiltersStore } from "../../store/propertyFiltersStore";

import NumberInputModal from "../modals/NumberInputModal";
import { PropertyTypeSelector } from "./PropertyTypeSelector";
import { SaveSearchModal } from "./SaveSearchModal";
import { PriceSection } from "./filters/PriceSection";
import { CharacteristicsSection } from "./filters/CharacteristicsSection";

import { COLORS } from "../../constants/colors";
import { getCamposVisibles } from "../../constants/propertyData";
import { KeyboardAvoidingView } from "react-native";
import { useGeoLocation } from "../../hooks/useGeoLocation";
import SelectionModal from "../modals/SelectionModal";
import MultiSelectionModal from "../modals/MultiSelectionModal";

const { height } = Dimensions.get("window");

interface SearchFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  filteredPropertiesCount: number;
  userId?: string;
  selectedLocation?: {
    type: "estado" | "municipio" | "colonia";
    name: string;
    estado_id: number;
  } | null;
}

export const SearchFiltersModal: React.FC<SearchFiltersModalProps> = ({
  visible,
  onClose,
  filteredPropertiesCount,
  userId,
  selectedLocation,
}) => {
  const { filters, updateFilter: onUpdateFilter, updateLocationFilter: onUpdateLocationFilter } = usePropertyFiltersStore();

  // Estados para modals
  const [showRecamarasModal, setShowRecamarasModal] = useState(false);
  const [showBanosModal, setShowBanosModal] = useState(false);
  const [showEstacionamientosModal, setShowEstacionamientosModal] =
    useState(false);
  const [showNivelesModal, setShowNivelesModal] = useState(false);
  const [showAntiguedadModal, setShowAntiguedadModal] = useState(false);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [showColoniaModal, setShowColoniaModal] = useState(false);

  // Geo Location Hook para las colonias
  const [geoEstadoId, setGeoEstadoId] = useState<string | null>(null);
  const { colonias, fetchColonias, fetchEstados, estados, isLoading } =
    useGeoLocation();

  // 1. Intentar obtener el ID del estado por nombre si no viene en el objeto
  useEffect(() => {
    if (
      selectedLocation &&
      !selectedLocation.estado_id &&
      selectedLocation.name
    ) {
      if (selectedLocation.type === "estado") {
        const findEstado = async () => {
          try {
            const { supabaseGeo } = await import("../../lib/supabase-geo");
            // Limpiar el nombre (ej: "Nuevo León, México" -> "Nuevo León")
            const parts = selectedLocation.name.split(",").map((p) => p.trim());
            const searchName =
              parts
                .filter(
                  (p) =>
                    p.toLowerCase() !== "méxico" &&
                    p.toLowerCase() !== "mexico",
                )
                .pop() || parts[0];

            const { data } = await supabaseGeo.rpc("obtener_estados", {
              p_nombre_busqueda: searchName,
            });
            if (data && data.length > 0) {
              setGeoEstadoId(String(data[0].id));
            } else {
              setGeoEstadoId(null);
            }
          } catch (error) {
            console.error("Error mapping state name to ID:", error);
          }
        };
        findEstado();
      } else {
        // Es un municipio o colonia que debería traer ya el estado_id o estar en un formato que no podemos resolver así.
        setGeoEstadoId(null);
      }
    } else if (selectedLocation && selectedLocation.estado_id) {
      setGeoEstadoId(String(selectedLocation.estado_id));
    } else {
      setGeoEstadoId(null);
    }
  }, [selectedLocation?.name, selectedLocation?.estado_id]);
  // 2. Cargar colonias cuando tenemos el ID del estado (de la DB Geo)
  React.useEffect(() => {
    if (geoEstadoId) {
      fetchColonias("", geoEstadoId);
    }
  }, [geoEstadoId]);

  // Number Input Modal
  const [showNumberInput, setShowNumberInput] = useState(false);
  const [numberInputConfig, setNumberInputConfig] = useState({
    title: "",
    onSave: (val: string) => {},
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
                  !filters.operacion
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
              handleCurrencyChange={handleCurrencyChange}
            />

            {/* UBICACION - COLONIA */}
            {geoEstadoId && (
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Colonia</Text>

                <TouchableOpacity
                  style={[styles.selector, { marginTop: 12 }]}
                  onPress={() => setShowColoniaModal(true)}
                  disabled={colonias.length === 0}
                >
                  <Text
                    style={
                      Array.isArray(filters.locationFilter.colonia) &&
                      filters.locationFilter.colonia.length > 0
                        ? styles.selectorText
                        : [styles.selectorText, { color: COLORS.textTertiary }]
                    }
                  >
                    {isLoading
                      ? "Cargando colonias..."
                      : Array.isArray(filters.locationFilter.colonia) &&
                          filters.locationFilter.colonia.length > 0
                        ? `${filters.locationFilter.colonia.length} seleccionadas`
                        : "Seleccionar Colonias"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>

                <MultiSelectionModal
                  visible={showColoniaModal}
                  onClose={() => setShowColoniaModal(false)}
                  onSelect={(vals) => {
                    const names = vals.map((v) => {
                      const c = colonias.find((col) => col.value === v);
                      // Extraer solo el nombre de la colonia (eliminar " - Municipio")
                      return c ? c.label.split(" - ")[0] : v;
                    });
                    onUpdateLocationFilter({
                      ...filters.locationFilter,
                      colonia: names,
                    });
                  }}
                  title="Selecciona Colonias"
                  options={colonias}
                  currentValues={
                    Array.isArray(filters.locationFilter.colonia)
                      ? filters.locationFilter.colonia.map((name) => {
                          const f = colonias.find(
                            (c) => c.label.split(" - ")[0] === name,
                          );
                          return f ? f.value : name;
                        })
                      : []
                  }
                  searchable
                />
              </View>
            )}

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
              camposVisibles={camposVisibles}
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
    marginBottom: 20,
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
