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
  OPCIONES_AMUEBLADO,
  OPCIONES_SI_NO,
  getLabelRecamaras,
  esTerreno,
  TipoPrincipal,
} from "../../../constants/propertyData";
import type {
  SiNo,
  AmuebladoType,
  TipoOperacion,
  NumberInputConfig,
} from "./types";

interface PhysicalFeaturesSectionProps {
  tipoPrincipal: string;
  subtipo: string;
  tipoOperacion: TipoOperacion;
  camposVisibles: ReturnType<
    typeof import("../../../constants/propertyData").getCamposVisibles
  >;
  recamaras: string;
  setRecamaras: (val: string) => void;
  banosCompletos: string;
  setBanosCompletos: (val: string) => void;
  mediosBanos: string;
  setMediosBanos: (val: string) => void;
  estacionamientos: string;
  setEstacionamientos: (val: string) => void;
  m2Construccion: string;
  setM2Construccion: (val: string) => void;
  m2Terreno: string;
  setM2Terreno: (val: string) => void;
  niveles: string;
  setNiveles: (val: string) => void;
  antiguedad: string;
  setAntiguedad: (val: string) => void;
  amueblado: AmuebladoType;
  setAmueblado: (val: AmuebladoType) => void;
  petFriendly: SiNo;
  setPetFriendly: (val: SiNo) => void;
  errors: Record<string, string>;
  clearError: (key: string) => void;
}

export const PhysicalFeaturesSection = React.memo(
  function PhysicalFeaturesSection({
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
    niveles,
    setNiveles,
    antiguedad,
    setAntiguedad,
    amueblado,
    setAmueblado,
    petFriendly,
    setPetFriendly,
    errors,
    clearError,
  }: PhysicalFeaturesSectionProps) {
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
        <View style={styles.sectionHeader}>
          <Ionicons name="home" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Características Físicas</Text>
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
              <Text style={styles.selectorText}>{niveles || "1"}</Text>
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
              options={[...NIVELES]}
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

        {/* M2 CONSTRUCCIÓN */}
        {camposVisibles.m2Construccion && (
          <AppInput
            label="m² de Construcción *"
            placeholder="m²"
            keyboardType="decimal-pad"
            value={m2Construccion || ""}
            onChangeText={(text) => {
              setM2Construccion(text);
              if (text) {
                clearError("m2");
                clearError("m2Construccion");
              }
            }}
            error={errors.m2}
          />
        )}

        {/* M2 TERRENO */}
        {camposVisibles.m2Terreno && (
          <AppInput
            label={`m² de Terreno ${esTerreno(subtipo) ? "*" : ""}`}
            placeholder="m²"
            keyboardType="decimal-pad"
            value={m2Terreno || ""}
            onChangeText={(text) => {
              setM2Terreno(text);
              if (text) {
                clearError("m2");
                clearError("m2Terreno");
              }
            }}
            error={errors.m2 || errors.m2Terreno}
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
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
