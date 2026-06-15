// ============================================
// PhysicalFeaturesSection - Características Físicas
// ============================================

import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../design-system/components/AppInput";
import { SelectionModal, WheelNumberModal } from "../../modals";
import NumberInputModal from "../../modals/NumberInputModal";
import RadioGroupSelector from "../../common/RadioGroupSelector";
import { COLORS } from "../../../constants/colors";
import {
  RECAMARAS,
  BANOS,
  MEDIOS_BANOS,
  ESTACIONAMIENTOS,
  NIVELES,
  formatNivelLabel,
  OPCIONES_AMUEBLADO,
  OPCIONES_SI_NO,
  getLabelRecamaras,
  esTerreno,
  TipoPrincipal,
} from "../../../constants/propertyData";
import { formatThousands } from "../../../utils/numberFormatter";
import type {
  SiNo,
  AmuebladoType,
  NumberInputConfig,
} from "./types";
import { usePropertyFormContext } from "./PropertyFormContext";

export const PhysicalFeaturesSection = React.memo(
  function PhysicalFeaturesSection() {
    const {
      tipoPrincipal,
      subtipo,
      tipoOperacion,
      camposVisibles,
      recamaras,
      setRecamaras,
      banosCompletos,
      setBanosCompletos,
      mediosBanos,
      setMediosBanos,
      estacionamientos,
      setEstacionamientos,
      m2Construccion,
      setM2Construccion,
      m2Terreno,
      setM2Terreno,
      anchoTerreno,
      setAnchoTerreno,
      largoTerreno,
      setLargoTerreno,
      niveles,
      setNiveles,
      antiguedad,
      setAntiguedad,
      amueblado,
      setAmueblado,
      petFriendly,
      setPetFriendly,
      costoMantenimiento,
      setCostoMantenimiento,
      errors,
      clearError,
    } = usePropertyFormContext();
    // Modal states locales
    const [showRecamarasModal, setShowRecamarasModal] = useState(false);
    const [showBanosModal, setShowBanosModal] = useState(false);
    const [showMediosBanosModal, setShowMediosBanosModal] = useState(false);
    const [showEstacionamientosModal, setShowEstacionamientosModal] =
      useState(false);
    const [showNivelesModal, setShowNivelesModal] = useState(false);
    const [showAntiguedadModal, setShowAntiguedadModal] = useState(false);
    const [showNumberInput, setShowNumberInput] = useState(false);
    const [numberInputConfig, setNumberInputConfig] =
      useState<NumberInputConfig>({
        title: "",
        onSave: () => {},
      });

    const openNumberInput = useCallback(
      (title: string, onSave: (val: string) => void) => {
        setNumberInputConfig({ title, onSave });
        setShowNumberInput(true);
      },
      [],
    );

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderBand}>
          <Ionicons name="home-outline" size={18} color={COLORS.primary} />
          <Text style={styles.sectionTitleBand}>Características Físicas</Text>
        </View>

        {/* RECÁMARAS */}
        {camposVisibles.recamaras && (
          <>
            <Text style={styles.label}>
              {getLabelRecamaras(tipoPrincipal as TipoPrincipal)}
            </Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowRecamarasModal(true)}
            >
              <Text style={styles.selectorText}>{recamaras || "0"}</Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            <SelectionModal
              visible={showRecamarasModal}
              onClose={() => setShowRecamarasModal(false)}
              onSelect={(val) => {
                if (val === "Más") {
                  openNumberInput(
                    getLabelRecamaras(tipoPrincipal as TipoPrincipal),
                    (customVal) => setRecamaras(customVal),
                  );
                } else {
                  setRecamaras(val);
                }
              }}
              title={getLabelRecamaras(tipoPrincipal as TipoPrincipal)}
              options={[...RECAMARAS]}
              currentValue={recamaras}
            />
          </>
        )}

        {/* BAÑOS COMPLETOS */}
        {camposVisibles.banos && (
          <>
            <Text style={styles.label}>Baños Completos</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowBanosModal(true)}
            >
              <Text style={styles.selectorText}>{banosCompletos || "0"}</Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            <SelectionModal
              visible={showBanosModal}
              onClose={() => setShowBanosModal(false)}
              onSelect={(val) => {
                if (val === "Más") {
                  openNumberInput("Baños Completos", (customVal) =>
                    setBanosCompletos(customVal),
                  );
                } else {
                  setBanosCompletos(val);
                }
              }}
              title="Baños Completos"
              options={[...BANOS]}
              currentValue={banosCompletos}
            />
          </>
        )}

        {/* MEDIOS BAÑOS */}
        {camposVisibles.mediosBanos && (
          <>
            <Text style={styles.label}>1/2 Baños</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowMediosBanosModal(true)}
            >
              <Text style={styles.selectorText}>{mediosBanos || "0"}</Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            <SelectionModal
              visible={showMediosBanosModal}
              onClose={() => setShowMediosBanosModal(false)}
              onSelect={(val) => {
                if (val === "Más") {
                  openNumberInput("1/2 Baños", (customVal) =>
                    setMediosBanos(customVal),
                  );
                } else {
                  setMediosBanos(val);
                }
              }}
              title="1/2 Baños"
              options={[...MEDIOS_BANOS]}
              currentValue={mediosBanos}
            />
          </>
        )}

        {/* ESTACIONAMIENTOS */}
        {camposVisibles.estacionamientos && (
          <>
            <Text style={styles.label}>Estacionamientos</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowEstacionamientosModal(true)}
            >
              <Text style={styles.selectorText}>{estacionamientos || "0"}</Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            <SelectionModal
              visible={showEstacionamientosModal}
              onClose={() => setShowEstacionamientosModal(false)}
              onSelect={(val) => {
                if (val === "Más") {
                  openNumberInput("Estacionamientos", (customVal) =>
                    setEstacionamientos(customVal),
                  );
                } else {
                  setEstacionamientos(val);
                }
              }}
              title="Estacionamientos"
              options={[...ESTACIONAMIENTOS]}
              currentValue={estacionamientos}
            />
          </>
        )}

        {/* NIVELES */}
        {camposVisibles.niveles && (
          <>
            <Text style={styles.label}>Niveles</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowNivelesModal(true)}
            >
              <Text style={styles.selectorText}>
                {formatNivelLabel(niveles || "1")}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            <SelectionModal
              visible={showNivelesModal}
              onClose={() => setShowNivelesModal(false)}
              onSelect={(val) => {
                if (val === "Más") {
                  openNumberInput("Niveles", (customVal) =>
                    setNiveles(customVal),
                  );
                } else {
                  setNiveles(val);
                }
              }}
              title="Niveles"
              options={NIVELES.map((v) => ({ label: formatNivelLabel(v), value: v }))}
              currentValue={niveles}
            />
          </>
        )}

        {/* ANTIGÜEDAD */}
        {camposVisibles.antiguedad && (
          <>
            <Text style={styles.label}>Antigüedad (años)</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowAntiguedadModal(true)}
            >
              <Text
                style={
                  antiguedad ? styles.selectorText : styles.selectorPlaceholder
                }
              >
                {antiguedad || "Selecciona..."}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            <WheelNumberModal
              visible={showAntiguedadModal}
              onClose={() => setShowAntiguedadModal(false)}
              onSelect={(val) => setAntiguedad(val)}
              title="Antigüedad"
              min={0}
              max={70}
              currentValue={antiguedad}
            />
          </>
        )}

        {/* M2 CONSTRUCCIÓN + TERRENO — fila de 2 columnas */}
        {(camposVisibles.m2Construccion || camposVisibles.m2Terreno) && (
          <View style={styles.m2Row}>
            {camposVisibles.m2Construccion && (
              <View style={styles.m2Col}>
                <AppInput
                  label="m² Construidos *"
                  placeholder="m²"
                  keyboardType="decimal-pad"
                  value={m2Construccion || ""}
                  onChangeText={(text) => {
                    setM2Construccion(formatThousands(text));
                    if (text) {
                      clearError("m2");
                      clearError("m2Construccion");
                    }
                  }}
                  error={errors.m2}
                />
              </View>
            )}
            {camposVisibles.m2Terreno && (
              <View style={styles.m2Col}>
                <AppInput
                  label={`m² Terreno ${esTerreno(subtipo) ? "*" : ""}`}
                  placeholder="m²"
                  keyboardType="decimal-pad"
                  value={m2Terreno || ""}
                  onChangeText={(text) => {
                    setM2Terreno(formatThousands(text));
                    if (text) {
                      clearError("m2");
                      clearError("m2Terreno");
                    }
                  }}
                  error={errors.m2 || errors.m2Terreno}
                />
              </View>
            )}
          </View>
        )}

        {/* ANCHO Y LARGO (solo terrenos, opcionales) */}
        {esTerreno(subtipo) && (
          <View style={styles.m2Row}>
            <View style={styles.m2Col}>
              <AppInput
                label="Ancho (m)"
                placeholder="Opcional"
                keyboardType="decimal-pad"
                value={anchoTerreno || ""}
                onChangeText={(text) => setAnchoTerreno(formatThousands(text))}
              />
            </View>
            <View style={styles.m2Col}>
              <AppInput
                label="Largo (m)"
                placeholder="Opcional"
                keyboardType="decimal-pad"
                value={largoTerreno || ""}
                onChangeText={(text) => setLargoTerreno(formatThousands(text))}
              />
            </View>
          </View>
        )}

        {/* COSTO DE MANTENIMIENTO MENSUAL (todas las propiedades excepto agrícola, opcional) */}
        {camposVisibles.mantenimiento && (
          <AppInput
            label="Mantenimiento mensual (opcional)"
            placeholder="ej. 1,500"
            keyboardType="decimal-pad"
            value={costoMantenimiento || ""}
            onChangeText={(text) => setCostoMantenimiento(formatThousands(text))}
          />
        )}

        {/* AMUEBLADO */}
        {camposVisibles.amueblado && (
          <RadioGroupSelector
            label="Amueblado"
            options={[...OPCIONES_AMUEBLADO]}
            selectedValue={amueblado}
            onSelect={(val) => setAmueblado(val as AmuebladoType)}
          />
        )}

        {/* PET FRIENDLY */}
        {tipoOperacion === "renta" || tipoOperacion === "ambas"
          ? camposVisibles.petFriendly && (
              <RadioGroupSelector
                label="Mascotas Permitidas"
                options={[...OPCIONES_SI_NO]}
                selectedValue={petFriendly}
                onSelect={(val) => setPetFriendly(val as SiNo)}
              />
            )
          : null}

        {/* Number Input Modal */}
        <NumberInputModal
          visible={showNumberInput}
          onClose={() => setShowNumberInput(false)}
          onSave={numberInputConfig.onSave}
          title={numberInputConfig.title}
          placeholder="Ingresa un número"
          maxValue={999}
          minValue={0}
        />
      </View>
    );
  },
);

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
  m2Row: {
    flexDirection: "row",
    gap: 12,
  },
  m2Col: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  selector: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  selectorText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  selectorPlaceholder: {
    color: COLORS.textTertiary,
  },
});
