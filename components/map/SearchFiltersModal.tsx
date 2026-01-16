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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import RadioGroupSelector from "../common/RadioGroupSelector";
import CascadeLocationSelector from "../common/CascadeLocationSelector";
import SelectionModal from "../modals/SelectionModal";
import NumberInputModal from "../modals/NumberInputModal";
import { PropertyTypeSelector } from "./PropertyTypeSelector";
import { SaveSearchSection } from "./SaveSearchSection";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../context/ToastContext";
import { COLORS } from "../../constants/colors";
import {
  RECAMARAS,
  BANOS,
  ESTACIONAMIENTOS,
  NIVELES,
  TipoPrincipal,
  getLabelRecamaras,
  getCamposVisibles,
} from "../../constants/propertyData";
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
  const { showToast } = useToast();
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

  // Prospecto states
  const [createLead, setCreateLead] = useState(true);
  const [leadName, setLeadName] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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

  const handleSaveSearch = async () => {
    if (!userId) {
      Alert.alert("Error", "Debes iniciar sesión para guardar búsquedas");
      return;
    }

    // Validar campos obligatorios del prospecto si está activado
    // Validar campos obligatorios del prospecto si está activado
    if (createLead) {
      const newErrors: { [key: string]: string } = {};

      if (!leadName.trim()) {
        newErrors.leadName = "El nombre es obligatorio";
      }

      if (!leadPhone.trim()) {
        newErrors.leadPhone = "El teléfono es obligatorio";
      }

      if (!leadEmail.trim()) {
        newErrors.leadEmail = "El email es obligatorio";
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(leadEmail)) {
          newErrors.leadEmail = "Ingresa un email válido";
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // Limpiar errores si todo está bien
      setErrors({});
    }

    try {
      let leadId = null;

      // PASO 1: Si se activó "Registrar Prospecto", crear el lead primero
      if (createLead) {
        const leadInsertData: any = {
          nombre: leadName.trim(),
          telefono: leadPhone.trim(),
          email: leadEmail.trim(),
          usuario_id: userId,
          origen: "busqueda_guardada",
          estado: "nuevo",
          activo: true,
        };

        const { data: leadData, error: leadError } = await supabase
          .from("leads")
          .insert([leadInsertData])
          .select()
          .maybeSingle();

        if (leadError) {
          if (leadError.code === "23505") {
            const { data: existingLead, error: fetchError } = await supabase
              .from("leads")
              .select("id")
              .eq("email", leadEmail.trim())
              .eq("usuario_id", userId)
              .maybeSingle();

            if (fetchError) {
              throw new Error("No se pudo crear o encontrar el prospecto");
            }

            if (existingLead) {
              leadId = existingLead.id;
            }
          } else {
            throw leadError;
          }
        } else if (leadData) {
          leadId = leadData.id;
        }
      }

      // PASO 2: Preparar criterios de búsqueda en formato JSONB
      const criterios_busqueda: any = {
        operacion: filters.operacion,
      };

      if (filters.moneda) criterios_busqueda.moneda = filters.moneda;
      if (filters.tipoPropiedad)
        criterios_busqueda.tipo_propiedad = filters.tipoPropiedad;
      if (filters.subtipo) criterios_busqueda.subtipo = filters.subtipo;
      if (filters.precioMin)
        criterios_busqueda.precio_min = parseFloat(filters.precioMin);
      if (filters.precioMax)
        criterios_busqueda.precio_max = parseFloat(filters.precioMax);
      if (filters.habitaciones && filters.habitaciones !== "No indicado")
        criterios_busqueda.habitaciones = filters.habitaciones;
      if (filters.banos && filters.banos !== "No indicado")
        criterios_busqueda.banos = filters.banos;
      if (
        filters.estacionamientos &&
        filters.estacionamientos !== "No indicado"
      )
        criterios_busqueda.estacionamientos = filters.estacionamientos;
      if (filters.niveles && filters.niveles !== "No indicado")
        criterios_busqueda.niveles = filters.niveles;
      if (filters.antiguedad && filters.antiguedad !== "No indicado")
        criterios_busqueda.antiguedad = filters.antiguedad;
      if (filters.m2TerrenoMin)
        criterios_busqueda.m2_terreno_min = parseFloat(filters.m2TerrenoMin);
      if (filters.m2ConstruccionMin)
        criterios_busqueda.m2_construccion_min = parseFloat(
          filters.m2ConstruccionMin
        );
      if (filters.locationFilter.estado)
        criterios_busqueda.estado = filters.locationFilter.estado;
      if (filters.locationFilter.ciudad)
        criterios_busqueda.ciudad = filters.locationFilter.ciudad;
      if (filters.locationFilter.municipio)
        criterios_busqueda.municipio = filters.locationFilter.municipio;
      if (filters.locationFilter.colonia)
        criterios_busqueda.colonia = filters.locationFilter.colonia;

      // PASO 3: Preparar el objeto para insertar en busquedas_guardadas
      const insertData: any = {
        usuario_id: userId,
        criterios_busqueda: criterios_busqueda,
        activa: true,
        frecuencia_notificaciones: 24,
      };

      // Solo agregar tipo_operacion si tiene valor
      if (filters.operacion && filters.operacion !== "") {
        insertData.tipo_operacion = filters.operacion;
      }

      if (leadId) {
        insertData.lead_id = leadId;
      }

      if (filters.tipoPropiedad)
        insertData.tipo_propiedad = filters.tipoPropiedad;
      if (filters.subtipo) insertData.subtipo = filters.subtipo;
      if (filters.precioMin && !isNaN(parseFloat(filters.precioMin)))
        insertData.precio_min = parseFloat(filters.precioMin);
      if (filters.precioMax && !isNaN(parseFloat(filters.precioMax)))
        insertData.precio_max = parseFloat(filters.precioMax);

      if (filters.locationFilter.estado)
        insertData.estado = filters.locationFilter.estado;
      if (filters.locationFilter.ciudad)
        insertData.ciudad = filters.locationFilter.ciudad;
      if (filters.locationFilter.municipio)
        insertData.municipio = filters.locationFilter.municipio;
      if (filters.locationFilter.colonia)
        insertData.colonia = filters.locationFilter.colonia;

      if (filters.habitaciones && filters.habitaciones !== "No indicado") {
        const habNum = parseInt(filters.habitaciones);
        if (!isNaN(habNum)) insertData.habitaciones = habNum;
      }
      if (filters.banos && filters.banos !== "No indicado") {
        const banosNum = parseInt(filters.banos);
        if (!isNaN(banosNum)) insertData.banos = banosNum;
      }
      if (
        filters.estacionamientos &&
        filters.estacionamientos !== "No indicado"
      ) {
        const estNum = parseInt(filters.estacionamientos);
        if (!isNaN(estNum)) insertData.estacionamientos = estNum;
      }
      if (
        filters.m2ConstruccionMin &&
        !isNaN(parseFloat(filters.m2ConstruccionMin))
      )
        insertData.metros_construccion = parseFloat(filters.m2ConstruccionMin);
      if (filters.m2TerrenoMin && !isNaN(parseFloat(filters.m2TerrenoMin)))
        insertData.metros_terreno = parseFloat(filters.m2TerrenoMin);

      if (filters.moneda) {
        const { data: monedaData, error: monedaError } = await supabase
          .from("configuracion_monedas")
          .select("codigo")
          .eq("simbolo", filters.moneda === "MXN" ? "$" : "USD")
          .eq("activa", true)
          .single();

        if (monedaData && !monedaError) {
          insertData.moneda = monedaData.codigo;
        } else {
          insertData.moneda = filters.moneda;
        }
      }

      // PASO 4: Insertar la búsqueda guardada

      const { data: searchData, error: searchError } = await supabase
        .from("busquedas_guardadas")
        .insert([insertData])
        .select()
        .maybeSingle();

      if (searchError) {
        console.error("❌ Error Supabase (busquedas_guardadas):", {
          message: searchError.message,
          details: searchError.details,
          hint: searchError.hint,
          code: searchError.code,
        });
        showToast("Error al guardar la búsqueda", "error");
        throw searchError;
      }

      showToast("Búsqueda guardada correctamente", "success");

      // Limpiar formulario
      setCreateLead(false);
      setLeadName("");
      setLeadPhone("");
      setLeadEmail("");
      onClose();
    } catch (error: any) {
      showToast(error.message || "Error al procesar el guardado", "error");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
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
          >
            <KeyboardAvoidingView>
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
                        val.toLowerCase() as "venta" | "renta"
                      );
                    }
                  }}
                />
              </View>

              {/* 2. PRECIO Y DIVISA */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>Rango de Precio</Text>
                  <View style={styles.currencyToggle}>
                    {(["MXN", "USD"] as const).map((curr) => (
                      <TouchableOpacity
                        key={curr}
                        onPress={() => onUpdateFilter("moneda", curr)}
                        style={[
                          styles.currencyBtn,
                          filters.moneda === curr && styles.currencyBtnActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.currencyText,
                            filters.moneda === curr &&
                              styles.currencyTextActive,
                          ]}
                        >
                          {curr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>Mínimo ({filters.moneda})</Text>
                    <AppInput
                      value={filters.precioMin}
                      onChangeText={(val) => onUpdateFilter("precioMin", val)}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <View style={styles.halfWidth}>
                    <Text style={styles.label}>Máximo ({filters.moneda})</Text>
                    <AppInput
                      value={filters.precioMax}
                      onChangeText={(val) => onUpdateFilter("precioMax", val)}
                      keyboardType="numeric"
                      placeholder="Sin límite"
                    />
                  </View>
                </View>
              </View>

              {/* 3. UBICACIÓN */}
              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Ubicación</Text>
                <CascadeLocationSelector
                  initialData={filters.locationFilter}
                  onChange={onUpdateLocationFilter}
                  showColonia={true}
                />
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
              {filters.tipoPropiedad && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>Características</Text>

                  {/* Recámaras */}
                  {camposVisibles.recamaras && (
                    <>
                      <Text style={styles.label}>
                        {getLabelRecamaras(
                          filters.tipoPropiedad as TipoPrincipal
                        )}
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
                      <SelectionModal
                        visible={showRecamarasModal}
                        onClose={() => setShowRecamarasModal(false)}
                        onSelect={(val) => {
                          if (val === "Más" || val.includes("Más")) {
                            setShowRecamarasModal(false);
                            openNumberInput(
                              getLabelRecamaras(
                                filters.tipoPropiedad as TipoPrincipal
                              ),
                              (value) => {
                                onUpdateFilter("habitaciones", value);
                                setShowNumberInput(false);
                              }
                            );
                          } else {
                            onUpdateFilter("habitaciones", val);
                          }
                        }}
                        title={getLabelRecamaras(
                          filters.tipoPropiedad as TipoPrincipal
                        )}
                        options={["No indicado", ...RECAMARAS]}
                        currentValue={filters.habitaciones}
                      />
                    </>
                  )}

                  {/* Baños */}
                  {camposVisibles.banos && (
                    <>
                      <Text style={[styles.label, { marginTop: 12 }]}>
                        Baños
                      </Text>
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
                      <SelectionModal
                        visible={showBanosModal}
                        onClose={() => setShowBanosModal(false)}
                        onSelect={(val) => {
                          if (val === "Más" || val.includes("Más")) {
                            setShowBanosModal(false);
                            openNumberInput("Baños", (value) => {
                              onUpdateFilter("banos", value);
                              setShowNumberInput(false);
                            });
                          } else {
                            onUpdateFilter("banos", val);
                          }
                        }}
                        title="Baños"
                        options={["No indicado", ...BANOS]}
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
                      <SelectionModal
                        visible={showEstacionamientosModal}
                        onClose={() => setShowEstacionamientosModal(false)}
                        onSelect={(val) => {
                          if (val === "Más" || val.includes("Más")) {
                            setShowEstacionamientosModal(false);
                            openNumberInput("Estacionamientos", (value) => {
                              onUpdateFilter("estacionamientos", value);
                              setShowNumberInput(false);
                            });
                          } else {
                            onUpdateFilter("estacionamientos", val);
                          }
                        }}
                        title="Estacionamientos"
                        options={["No indicado", ...ESTACIONAMIENTOS]}
                        currentValue={filters.estacionamientos}
                      />
                    </>
                  )}

                  {/* Niveles */}
                  {camposVisibles.niveles && (
                    <>
                      <Text style={[styles.label, { marginTop: 12 }]}>
                        Niveles
                      </Text>
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
                      <SelectionModal
                        visible={showNivelesModal}
                        onClose={() => setShowNivelesModal(false)}
                        onSelect={(val) => {
                          if (val === "Más" || val.includes("Más")) {
                            setShowNivelesModal(false);
                            openNumberInput("Niveles", (value) => {
                              onUpdateFilter("niveles", value);
                              setShowNumberInput(false);
                            });
                          } else {
                            onUpdateFilter("niveles", val);
                          }
                        }}
                        title="Niveles"
                        options={["No indicado", ...NIVELES]}
                        currentValue={filters.niveles}
                      />
                    </>
                  )}

                  {/* Antigüedad */}
                  {camposVisibles.antiguedad && (
                    <>
                      <Text style={[styles.label, { marginTop: 12 }]}>
                        Antigüedad
                      </Text>
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
                          onChangeText={(val) =>
                            onUpdateFilter("m2TerrenoMin", val)
                          }
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
                          onChangeText={(val) =>
                            onUpdateFilter("m2ConstruccionMin", val)
                          }
                          keyboardType="numeric"
                          placeholder="Mínimo"
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.divider} />

              {/* GUARDAR BÚSQUEDA CON SWITCH */}
              <SaveSearchSection
                createLead={createLead}
                onToggleCreateLead={setCreateLead}
                leadName={leadName}
                leadPhone={leadPhone}
                leadEmail={leadEmail}
                onChangeLeadName={setLeadName}
                onChangeLeadPhone={setLeadPhone}
                onChangeLeadEmail={setLeadEmail}
                onSave={handleSaveSearch}
                errors={errors}
              />
            </KeyboardAvoidingView>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyBtn} onPress={onClose}>
              <Text style={styles.applyBtnText}>
                Ver {filteredPropertiesCount} propiedades
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Number Input Modal */}
      <NumberInputModal
        visible={showNumberInput}
        onClose={() => setShowNumberInput(false)}
        onSave={numberInputConfig.onSave}
        title={numberInputConfig.title}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.blackTransparent50,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.85,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
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
    padding: 24,
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
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    backgroundColor: COLORS.white,
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  applyBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 24,
  },
});
