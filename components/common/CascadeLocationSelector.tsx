/**
 * CascadeLocationSelector.tsx
 * Selector en cascada para ubicaciones: Estado → Ciudad → Municipio → Colonia
 */

import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SelectionModal } from "../modals";
import { COLORS } from "../../constants/colors";
import {
  ESTADOS_MEXICO,
  getCiudadesPorEstado,
  getMunicipiosPorCiudad,
  getColoniasPorMunicipio,
} from "../../constants/locations";

interface LocationData {
  estado: string;
  ciudad: string;
  municipio: string;
  colonia: string;
}

interface CascadeLocationSelectorProps {
  initialData?: Partial<LocationData>;
  onChange: (data: LocationData) => void;
  showColonia?: boolean; // Opcional: mostrar selector de colonia
}

export default function CascadeLocationSelector({
  initialData,
  onChange,
  showColonia = true,
}: CascadeLocationSelectorProps) {
  const [estado, setEstado] = useState(initialData?.estado || "");
  const [ciudad, setCiudad] = useState(initialData?.ciudad || "");
  const [municipio, setMunicipio] = useState(initialData?.municipio || "");
  const [colonia, setColonia] = useState(initialData?.colonia || "");

  // Modals visibility
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [showCiudadModal, setShowCiudadModal] = useState(false);
  const [showMunicipioModal, setShowMunicipioModal] = useState(false);
  const [showColoniaModal, setShowColoniaModal] = useState(false);

  // Opciones disponibles según selección
  const [ciudadesDisponibles, setCiudadesDisponibles] = useState<string[]>([]);
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState<string[]>(
    []
  );
  const [coloniasDisponibles, setColoniasDisponibles] = useState<string[]>([]);

  // Actualizar opciones cuando cambia el estado
  useEffect(() => {
    if (estado) {
      const ciudades = getCiudadesPorEstado(estado);
      setCiudadesDisponibles(ciudades);

      // Si la ciudad seleccionada no está en el nuevo estado, resetear
      if (ciudad && !ciudades.includes(ciudad)) {
        setCiudad("");
        setMunicipio("");
        setColonia("");
      }
    } else {
      setCiudadesDisponibles([]);
      setCiudad("");
      setMunicipio("");
      setColonia("");
    }
  }, [estado]);

  // Actualizar municipios cuando cambia la ciudad
  useEffect(() => {
    if (ciudad) {
      const municipios = getMunicipiosPorCiudad(ciudad);
      setMunicipiosDisponibles(municipios);

      // Si el municipio seleccionado no está en la nueva ciudad, resetear
      if (municipio && !municipios.includes(municipio)) {
        setMunicipio("");
        setColonia("");
      }
    } else {
      setMunicipiosDisponibles([]);
      setMunicipio("");
      setColonia("");
    }
  }, [ciudad]);

  // Actualizar colonias cuando cambia el municipio
  useEffect(() => {
    if (municipio) {
      const colonias = getColoniasPorMunicipio(municipio);
      setColoniasDisponibles(colonias);

      // Si la colonia seleccionada no está en el nuevo municipio, resetear
      if (colonia && !colonias.includes(colonia)) {
        setColonia("");
      }
    } else {
      setColoniasDisponibles([]);
      setColonia("");
    }
  }, [municipio]);

  // Notificar cambios al componente padre
  useEffect(() => {
    onChange({
      estado,
      ciudad,
      municipio,
      colonia,
    });
  }, [estado, ciudad, municipio, colonia]);

  return (
    <View style={styles.container}>
      {/* Estado */}
      <View style={styles.field}>
        <Text style={styles.label}>Estado *</Text>
        <TouchableOpacity
          style={[styles.selector, !estado && styles.selectorEmpty]}
          onPress={() => setShowEstadoModal(true)}
        >
          <Text
            style={estado ? styles.selectorText : styles.selectorPlaceholder}
          >
            {estado || "Selecciona un estado..."}
          </Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <SelectionModal
        visible={showEstadoModal}
        onClose={() => setShowEstadoModal(false)}
        onSelect={(val) => setEstado(val)}
        title="Selecciona un Estado"
        options={[...ESTADOS_MEXICO]}
        currentValue={estado}
        searchable
      />

      {/* Ciudad */}
      {estado && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Ciudad *</Text>
            <TouchableOpacity
              style={[styles.selector, !ciudad && styles.selectorEmpty]}
              onPress={() => {
                if (ciudadesDisponibles.length > 0) {
                  setShowCiudadModal(true);
                }
              }}
              disabled={ciudadesDisponibles.length === 0}
            >
              <Text
                style={
                  ciudad ? styles.selectorText : styles.selectorPlaceholder
                }
              >
                {ciudadesDisponibles.length === 0
                  ? "No hay ciudades disponibles"
                  : ciudad || "Selecciona una ciudad..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <SelectionModal
            visible={showCiudadModal}
            onClose={() => setShowCiudadModal(false)}
            onSelect={(val) => setCiudad(val)}
            title="Selecciona una Ciudad"
            options={ciudadesDisponibles}
            currentValue={ciudad}
            searchable
          />
        </>
      )}

      {/* Municipio */}
      {ciudad && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Municipio *</Text>
            <TouchableOpacity
              style={[styles.selector, !municipio && styles.selectorEmpty]}
              onPress={() => {
                if (municipiosDisponibles.length > 0) {
                  setShowMunicipioModal(true);
                }
              }}
              disabled={municipiosDisponibles.length === 0}
            >
              <Text
                style={
                  municipio ? styles.selectorText : styles.selectorPlaceholder
                }
              >
                {municipiosDisponibles.length === 0
                  ? "No hay municipios disponibles"
                  : municipio || "Selecciona un municipio..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <SelectionModal
            visible={showMunicipioModal}
            onClose={() => setShowMunicipioModal(false)}
            onSelect={(val) => setMunicipio(val)}
            title="Selecciona un Municipio"
            options={municipiosDisponibles}
            currentValue={municipio}
            searchable
          />
        </>
      )}

      {/* Colonia (Opcional) */}
      {showColonia && municipio && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Colonia</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => {
                if (coloniasDisponibles.length > 0) {
                  setShowColoniaModal(true);
                }
              }}
              disabled={coloniasDisponibles.length === 0}
            >
              <Text
                style={
                  colonia ? styles.selectorText : styles.selectorPlaceholder
                }
              >
                {coloniasDisponibles.length === 0
                  ? "No hay colonias disponibles"
                  : colonia || "Selecciona una colonia..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <SelectionModal
            visible={showColoniaModal}
            onClose={() => setShowColoniaModal(false)}
            onSelect={(val) => setColonia(val)}
            title="Selecciona una Colonia"
            options={coloniasDisponibles}
            currentValue={colonia}
            searchable
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  field: {
    marginBottom: 12,
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
  },
  selectorEmpty: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTransparent,
  },
  selectorText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1,
  },
  selectorPlaceholder: {
    fontSize: 15,
    color: COLORS.primary,
    flex: 1,
  },
});
