import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  KeyboardProvider,
  KeyboardAwareScrollView,
} from "react-native-keyboard-controller";
import { AppBottomSheet } from "@/design-system/components/AppBottomSheet";
import { Ionicons } from "@expo/vector-icons";
import { usePropertyFiltersStore } from "../../store/propertyFiltersStore";
import { useSaveSearch } from "./filters/useSaveSearch";
import { useToast } from "../../context/ToastContext";

import NumberInputModal from "../modals/NumberInputModal";
import { PropertyTypeSelector } from "./PropertyTypeSelector";
import { PriceSection } from "./filters/PriceSection";
import { CharacteristicsSection } from "./filters/CharacteristicsSection";
import { CommissionFilterSection } from "./filters/CommissionFilterSection";
import { AgricolaFiltersSection } from "./filters/AgricolaFiltersSection";
import { ComercialFiltersSection } from "./filters/ComercialFiltersSection";
import { IndustrialFiltersSection } from "./filters/IndustrialFiltersSection";
import { AmenitiesFilterSection } from "./filters/AmenitiesFilterSection";

import { COLORS } from "../../constants/colors";
import { getCamposVisibles, TipoPrincipal } from "../../constants/propertyData";

const { height } = Dimensions.get("window");

interface SearchFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onViewResults?: () => void;
  filteredPropertiesCount: number;
  userId?: string;
  /** Si está presente, el modal opera en modo "editar búsqueda" */
  editBusquedaId?: string;
  /** Callback llamado cuando la búsqueda se actualiza exitosamente */
  onUpdateSearch?: () => void;
}

export const SearchFiltersModal: React.FC<SearchFiltersModalProps> = ({
  visible,
  onClose,
  onViewResults,
  filteredPropertiesCount,
  userId,
  editBusquedaId,
  onUpdateSearch,
}) => {
  const { filters, updateFilter: onUpdateFilter } = usePropertyFiltersStore();
  const { updateSearchInDatabase } = useSaveSearch(userId);
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const isEditMode = !!editBusquedaId;

  const handleUpdateSearch = async () => {
    if (!editBusquedaId) return;
    setIsSaving(true);
    try {
      await updateSearchInDatabase(editBusquedaId, filters);
      showToast("Búsqueda actualizada correctamente", "success");
      onUpdateSearch?.();
    } catch (err: any) {
      showToast(err?.message || "Error al actualizar la búsqueda", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Estados para modals
  const [showRecamarasModal, setShowRecamarasModal] = useState(false);
  const [showBanosModal, setShowBanosModal] = useState(false);
  const [showEstacionamientosModal, setShowEstacionamientosModal] =
    useState(false);
  const [showNivelesModal, setShowNivelesModal] = useState(false);
  const [showAntiguedadModal, setShowAntiguedadModal] = useState(false);

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

  const camposVisiblesBase = filters.tipoPropiedad
    ? getCamposVisibles(filters.subtipo, filters.tipoPropiedad as TipoPrincipal)
    : {
        recamaras: false,
        banos: false,
        estacionamientos: false,
        niveles: false,
        antiguedad: false,
        m2Terreno: false,
        m2Construccion: false,
        amenidades: false,
      };

  // Reglas propias del post de búsqueda (no afectan el flujo de publicar propiedad):
  // - Industrial no usa "niveles".
  // - Amenidades solo aplican a Habitacional.
  const camposVisibles = {
    ...camposVisiblesBase,
    niveles: camposVisiblesBase.niveles && filters.tipoPropiedad !== "industrial",
    amenidades: camposVisiblesBase.amenidades && filters.tipoPropiedad === "habitacional",
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
    <AppBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.modalContent}>
        <KeyboardProvider>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {isEditMode ? "Editar búsqueda" : "Filtros de Búsqueda"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isEditMode
                  ? "Modifica los criterios y guarda los cambios"
                  : "Ajusta los criterios para encontrar tu propiedad"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            style={styles.modalScroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            bottomOffset={100}
            scrollEnabled={scrollEnabled}
          >
            {/* 1. TIPO DE OPERACIÓN (Venta y/o Renta) */}
            <View style={styles.formSection}>
              <Text style={styles.operacionLabel}>Tipo de Operación</Text>
              <View style={styles.operacionChipsRow}>
                {(["venta", "renta"] as const).map((op) => {
                  // operacion === "" significa "ambas" → ambos chips activos
                  const active =
                    filters.operacion === "" || filters.operacion === op;
                  return (
                    <TouchableOpacity
                      key={op}
                      style={[
                        styles.operacionChip,
                        active && styles.operacionChipActive,
                      ]}
                      onPress={() => {
                        // Desde "ambas" (""): seleccionar solo la tocada.
                        // Tocar la única activa: volver a "ambas". Tocar la otra: cambiar a esa.
                        onUpdateFilter(
                          "operacion",
                          (filters.operacion === op ? "" : op) as
                            | "venta"
                            | "renta"
                            | "",
                        );
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.operacionChipText,
                          active && styles.operacionChipTextActive,
                        ]}
                      >
                        {op === "venta" ? "Venta" : "Renta"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. PRECIO Y DIVISA */}
            <PriceSection
              handleCurrencyChange={handleCurrencyChange}
            />

            {/* 3. COMISIÓN MÍNIMA */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Comisión mínima</Text>
              <View style={{ marginTop: 12 }}>
                <CommissionFilterSection onScrollLock={setScrollEnabled} />
              </View>
            </View>

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

            {/* 5b. AMENIDADES (habitacional/comercial/industrial; no terreno/agrícola) */}
            {camposVisibles.amenidades && (
              <View style={styles.formSection}>
                <AmenitiesFilterSection />
              </View>
            )}

            {/* 6. FILTROS ESPECIALIZADOS POR TIPO */}
            {filters.tipoPropiedad === 'agricola' && (
              <View style={styles.formSection}>
                <AgricolaFiltersSection />
              </View>
            )}
            {filters.tipoPropiedad === 'comercial' && (
              <View style={styles.formSection}>
                <ComercialFiltersSection />
              </View>
            )}
            {filters.tipoPropiedad === 'industrial' && (
              <View style={styles.formSection}>
                <IndustrialFiltersSection />
              </View>
            )}

            <View style={styles.divider} />
          </KeyboardAwareScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            {isEditMode ? (
              <TouchableOpacity
                style={[styles.applyBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleUpdateSearch}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.white} style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons name="save-outline" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                )}
                <Text style={styles.applyBtnText}>
                  {isSaving ? "Guardando…" : "Actualizar búsqueda"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={onViewResults ?? onClose}
              >
                <Text style={styles.applyBtnText}>
                  Ver {filteredPropertiesCount} propiedades
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardProvider>
      </View>

      {/* Number Input Modal */}
      <NumberInputModal
        visible={showNumberInput}
        onClose={() => setShowNumberInput(false)}
        onSave={numberInputConfig.onSave}
        title={numberInputConfig.title}
      />
    </AppBottomSheet>
  );
};

const styles = StyleSheet.create({
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
  operacionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  operacionChipsRow: {
    flexDirection: "row",
    gap: 10,
  },
  operacionChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
  },
  operacionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  operacionChipText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  operacionChipTextActive: {
    color: COLORS.white,
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
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 24,
  },
});
