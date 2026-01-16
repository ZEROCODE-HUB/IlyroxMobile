import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import {
  ESTADOS_MEXICO,
  getCiudadesPorEstado,
  getMunicipiosPorCiudad,
  getColoniasPorMunicipio,
} from "../../constants/locations";
import { PROPERTY_TYPES, TipoPrincipal } from "../../constants/propertyData";
import SelectionModal from "../modals/SelectionModal";
import { ScreenWrapper } from "../../screens/ScreenWrapper";

const { height } = Dimensions.get("window");

interface StatisticsFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: {
    location: {
      estado: string;
      ciudad: string;
      municipio: string;
      colonia: string;
    };
    propertyType: {
      type: string;
      subtype: string;
    };
    operationType: string;
  }) => void;
  currentFilters: {
    location: {
      estado: string;
      ciudad: string;
      municipio: string;
      colonia: string;
    };
    propertyType: {
      type: string;
      subtype: string;
    };
    operationType: string;
  };
}

export const StatisticsFilterModal: React.FC<StatisticsFilterModalProps> = ({
  visible,
  onClose,
  onApply,
  currentFilters,
}) => {
  // Local state for filters
  const [location, setLocation] = useState(currentFilters.location);
  const [pType, setPType] = useState(currentFilters.propertyType);
  const [opType, setOpType] = useState(currentFilters.operationType);

  // Selection Modal State
  const [activeSelector, setActiveSelector] = useState<{
    type: "estado" | "ciudad" | "municipio" | "colonia" | "tipo" | "subtipo";
    options: string[];
    visible: boolean;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      setLocation(currentFilters.location);
      setPType(currentFilters.propertyType);
      setOpType(currentFilters.operationType);
    }
  }, [visible, currentFilters]);

  const handleLocationChange = (
    field: "estado" | "ciudad" | "municipio" | "colonia",
    value: string
  ) => {
    setLocation((prev) => {
      const newState = { ...prev, [field]: value };
      // Cascading resets
      if (field === "estado") {
        newState.ciudad = "";
        newState.municipio = "";
        newState.colonia = "";
      } else if (field === "ciudad") {
        newState.municipio = "";
        newState.colonia = "";
      } else if (field === "municipio") {
        newState.colonia = "";
      }
      return newState;
    });
  };

  const openSelector = (
    type: "estado" | "ciudad" | "municipio" | "colonia" | "tipo" | "subtipo"
  ) => {
    let options: string[] = [];
    let title = "";

    switch (type) {
      case "estado":
        options = [...ESTADOS_MEXICO];
        title = "Selecciona Estado";
        break;
      case "ciudad":
        options = getCiudadesPorEstado(location.estado);
        title = "Selecciona Ciudad";
        break;
      case "municipio":
        options = getMunicipiosPorCiudad(location.ciudad);
        title = "Selecciona Municipio";
        break;
      case "colonia":
        options = getColoniasPorMunicipio(location.municipio);
        title = "Selecciona Colonia";
        break;
      case "tipo":
        options = Object.keys(PROPERTY_TYPES).map(
          (k) => k.charAt(0).toUpperCase() + k.slice(1)
        );
        title = "Tipo de Propiedad";
        break;
      case "subtipo":
        if (pType.type) {
          const key = pType.type.toLowerCase() as TipoPrincipal;
          options = [...(PROPERTY_TYPES[key] || [])];
        }
        title = "Subtipo de Propiedad";
        break;
    }

    if (type !== "estado" && type !== "tipo" && options.length === 0) {
      if (type === "subtipo" && !pType.type) {
        // No type selected
      } else {
        // Handle empty options or notify user? For now just allow clear
      }
    }

    setActiveSelector({
      type,
      options: ["Todos", ...options],
      visible: true,
      title,
    });
  };

  const handleSelection = (value: string) => {
    if (!activeSelector) return;
    const val = value === "Todos" ? "" : value;

    if (
      activeSelector.type === "estado" ||
      activeSelector.type === "ciudad" ||
      activeSelector.type === "municipio" ||
      activeSelector.type === "colonia"
    ) {
      handleLocationChange(activeSelector.type, val);
    } else if (activeSelector.type === "tipo") {
      setPType({ type: val, subtype: "" });
    } else if (activeSelector.type === "subtipo") {
      setPType((prev) => ({ ...prev, subtype: val }));
    }

    setActiveSelector(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Filtros Avanzados</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            {/* Operation Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Operación</Text>
              <View style={styles.chipsContainer}>
                {["Venta", "Renta"].map((op) => (
                  <TouchableOpacity
                    key={op}
                    style={[styles.chip, opType === op && styles.chipActive]}
                    onPress={() => setOpType(op)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        opType === op && styles.chipTextActive,
                      ]}
                    >
                      {op}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ubicación</Text>

              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => openSelector("estado")}
              >
                <Text style={styles.label}>Estado</Text>
                <Text style={styles.value}>{location.estado || "Todos"}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdown, !location.estado && styles.disabled]}
                onPress={() => location.estado && openSelector("ciudad")}
                disabled={!location.estado}
              >
                <Text style={styles.label}>Ciudad</Text>
                <Text style={styles.value}>{location.ciudad || "Todas"}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdown, !location.ciudad && styles.disabled]}
                onPress={() => location.ciudad && openSelector("municipio")}
                disabled={!location.ciudad}
              >
                <Text style={styles.label}>Municipio</Text>
                <Text style={styles.value}>
                  {location.municipio || "Todos"}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dropdown,
                  !location.municipio && styles.disabled,
                ]}
                onPress={() => location.municipio && openSelector("colonia")}
                disabled={!location.municipio}
              >
                <Text style={styles.label}>Colonia</Text>
                <Text style={styles.value}>{location.colonia || "Todas"}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {/* Property Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo de Propiedad</Text>

              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => openSelector("tipo")}
              >
                <Text style={styles.label}>Categoría</Text>
                <Text style={styles.value}>{pType.type || "Todas"}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dropdown, !pType.type && styles.disabled]}
                onPress={() => pType.type && openSelector("subtipo")}
                disabled={!pType.type}
              >
                <Text style={styles.label}>Subtipo</Text>
                <Text style={styles.value}>{pType.subtype || "Todos"}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setLocation({
                  estado: "",
                  ciudad: "",
                  municipio: "",
                  colonia: "",
                });
                setPType({ type: "Todos", subtype: "" });
                setOpType("Venta");
              }}
            >
              <Text style={styles.resetText}>Restablecer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, { flex: 1, marginLeft: 12 }]}
              onPress={() =>
                onApply({
                  location,
                  propertyType: pType,
                  operationType: opType,
                })
              }
            >
              <Text style={styles.applyText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Selection Modal Reuse */}
      {activeSelector && (
        <SelectionModal
          visible={activeSelector.visible}
          title={activeSelector.title}
          options={activeSelector.options}
          onClose={() => setActiveSelector(null)}
          onSelect={handleSelection}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.85,
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: "600",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  disabled: {
    backgroundColor: COLORS.background,
    borderColor: "transparent",
    opacity: 0.6,
  },
  label: {
    fontSize: 12,
    color: COLORS.textTertiary,
    width: 80,
  },
  value: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: "right",
    marginRight: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: Platform.OS === "ios" ? 20 : 50,
  },
  resetBtn: {
    padding: 12,
  },
  resetText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  applyText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 16,
  },
});
