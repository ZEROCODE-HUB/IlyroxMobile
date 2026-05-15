import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import SelectionModal from "../modals/SelectionModal";
import { useGeoLocation } from "../../hooks/useGeoLocation";

interface LocationData {
  estado: string;
  ciudad: string;
  municipio: string;
  colonia: string;
  colonias?: string[];
  latitud?: number;
  longitud?: number;
}

interface CascadeLocationSelectorProps {
  initialData?: Partial<LocationData>;
  onChange: (data: LocationData) => void;
  showColonia?: boolean;
  isMandatory?: boolean;
  multiColonia?: boolean;
}

export default function CascadeLocationSelector({
  initialData,
  onChange,
  showColonia = false,
  isMandatory = true,
  multiColonia = false,
}: CascadeLocationSelectorProps) {
  // We need to match existing string values to IDs or just allow selection
  const [estadoLabel, setEstadoLabel] = useState(initialData?.estado || "");
  const [municipioLabel, setMunicipioLabel] = useState(
    initialData?.municipio || "",
  );
  const [coloniaLabel, setColoniaLabel] = useState(initialData?.colonia || "");
  const [coloniaLabels, setColoniaLabels] = useState<string[]>(
    Array.isArray(initialData?.colonias) && initialData!.colonias!.length > 0
      ? initialData!.colonias!
      : initialData?.colonia
        ? [initialData.colonia]
        : [],
  );

  const [estadoId, setEstadoId] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [coloniaId, setColoniaId] = useState("");

  const [latitud, setLatitud] = useState<number | undefined>(
    initialData?.latitud,
  );
  const [longitud, setLongitud] = useState<number | undefined>(
    initialData?.longitud,
  );

  const {
    estados,
    municipios,
    colonias,
    isLoading,
    fetchMunicipios,
    fetchColonias,
    clearMunicipios,
    clearColonias,
  } = useGeoLocation();

  // Sync with asynchronous updates to initialData (when editing a property)
  useEffect(() => {
    if (initialData) {
      const { estado, municipio, colonia, colonias, latitud: initLat, longitud: initLng } = initialData;
      if (estado !== undefined && estado !== estadoLabel) setEstadoLabel(estado);
      if (municipio !== undefined && municipio !== municipioLabel) setMunicipioLabel(municipio);
      if (colonia !== undefined && colonia !== coloniaLabel) setColoniaLabel(colonia);
      if (multiColonia) {
        const incoming = Array.isArray(colonias) && colonias.length > 0
          ? colonias
          : colonia
            ? [colonia]
            : [];
        const equal =
          incoming.length === coloniaLabels.length &&
          incoming.every((c, i) => c === coloniaLabels[i]);
        if (!equal && incoming.length > 0) setColoniaLabels(incoming);
      }
      if (initLat !== undefined && initLat !== latitud) setLatitud(initLat);
      if (initLng !== undefined && initLng !== longitud) setLongitud(initLng);
    }
  }, [initialData?.estado, initialData?.municipio, initialData?.colonia, initialData?.colonias]);

  // Modals visibility
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [showMunicipioModal, setShowMunicipioModal] = useState(false);
  const [showColoniaModal, setShowColoniaModal] = useState(false);

  // Re-fetch dependent dropdowns if IDs are selected
  useEffect(() => {
    if (estadoId) {
      fetchMunicipios(estadoId);
    } else {
      clearMunicipios();
    }
  }, [estadoId]);

  useEffect(() => {
    if (municipioId) {
      fetchColonias(municipioId);
    } else {
      clearColonias();
    }
  }, [municipioId]);

  // Resolve IDs from labels if they were provided as strings in initialData
  useEffect(() => {
    if (estados.length > 0 && estadoLabel && !estadoId) {
      const match = estados.find(e => e.label === estadoLabel);
      if (match) setEstadoId(match.value);
    }
  }, [estados, estadoLabel, estadoId]);

  useEffect(() => {
    if (municipios.length > 0 && municipioLabel && !municipioId) {
      const match = municipios.find(m => m.label === municipioLabel);
      if (match) setMunicipioId(match.value);
    }
  }, [municipios, municipioLabel, municipioId]);

  useEffect(() => {
    if (colonias.length > 0 && coloniaLabel && !coloniaId) {
      const match = colonias.find(c => {
        const nameOnly = c.label.split(" - ")[0] || c.label;
        return nameOnly === coloniaLabel;
      });
      if (match) setColoniaId(match.value);
    }
  }, [colonias, coloniaLabel, coloniaId]);

  // Handle onChange
  useEffect(() => {
    const primaryColonia = multiColonia
      ? coloniaLabels[0] ?? ""
      : coloniaLabel;
    onChange({
      estado: estadoLabel,
      ciudad: "", // Ciudad is removed, keeping empty string.
      municipio: municipioLabel,
      colonia: primaryColonia,
      colonias: multiColonia ? coloniaLabels : primaryColonia ? [primaryColonia] : [],
      latitud,
      longitud,
    });
  }, [estadoLabel, municipioLabel, coloniaLabel, coloniaLabels, latitud, longitud, multiColonia]);

  // SIMPLE ID RESOLUTION (For editing mode)
  // When options are loaded, if we have a label but no ID, find the ID.
  useEffect(() => {
    if (estados.length > 0 && estadoLabel && !estadoId) {
      const match = estados.find(e => e.label === estadoLabel);
      if (match) setEstadoId(match.value);
    }
  }, [estados, estadoLabel, estadoId]);

  useEffect(() => {
    if (municipios.length > 0 && municipioLabel && !municipioId) {
      const match = municipios.find(m => m.label === municipioLabel);
      if (match) setMunicipioId(match.value);
    }
  }, [municipios, municipioLabel, municipioId]);

  useEffect(() => {
    if (colonias.length > 0 && coloniaLabel && !coloniaId) {
      const match = colonias.find(c => {
        const nameOnly = c.label.split(" - ")[0] || c.label;
        return nameOnly === coloniaLabel;
      });
      if (match) setColoniaId(match.value);
    }
  }, [colonias, coloniaLabel, coloniaId]);

  // Mappers and handlers
  const handleEstadoSelect = (valId: string) => {
    const selected = estados.find((e) => e.value === valId);
    if (selected) {
      setEstadoId(valId);
      setEstadoLabel(selected.label);
      if (selected.latitud && selected.longitud) {
        setLatitud(selected.latitud);
        setLongitud(selected.longitud);
      }
      if (valId !== estadoId) {
        setMunicipioId("");
        setMunicipioLabel("");
        setColoniaId("");
        setColoniaLabel("");
      }
    }
  };

  const handleMunicipioSelect = (valId: string) => {
    const selected = municipios.find((m) => m.value === valId);
    if (selected) {
      setMunicipioId(valId);
      setMunicipioLabel(selected.label);
      if (valId !== municipioId) {
        setColoniaId("");
        setColoniaLabel("");
        setColoniaLabels([]);
      }
    }
  };

  const handleColoniaSelect = (valId: string) => {
    const selected = colonias.find((c) => c.value === valId);
    if (selected) {
      // Remove text after " - " which was added for label context
      const nameOnly = selected.label.split(" - ")[0] || selected.label;
      if (multiColonia) {
        setColoniaLabels((prev) =>
          prev.includes(nameOnly) ? prev : [...prev, nameOnly],
        );
      } else {
        setColoniaId(valId);
        setColoniaLabel(nameOnly);
      }
      if (selected.latitud && selected.longitud) {
        setLatitud(selected.latitud);
        setLongitud(selected.longitud);
      }
    }
  };

  const handleRemoveColonia = (name: string) => {
    setColoniaLabels((prev) => prev.filter((c) => c !== name));
  };

  return (
    <View style={styles.container}>
      {/* Estado */}
      <View style={styles.field}>
        <Text style={styles.label}>Estado{isMandatory ? " *" : ""}</Text>
        <TouchableOpacity
          style={[
            styles.selector,
            isMandatory && !estadoLabel && styles.selectorEmpty,
          ]}
          onPress={() => setShowEstadoModal(true)}
        >
          <Text
            style={
              estadoLabel ? styles.selectorText : styles.selectorPlaceholder
            }
          >
            {estadoLabel || "Selecciona un estado..."}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <SelectionModal
        visible={showEstadoModal}
        onClose={() => setShowEstadoModal(false)}
        onSelect={handleEstadoSelect}
        title="Selecciona un Estado"
        options={estados}
        currentValue={estadoId}
        searchable
      />

      {/* Municipio */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Municipio
          {isMandatory && municipios.length > 0 ? " *" : ""}
        </Text>
        <TouchableOpacity
          style={[
            styles.selector,
            isMandatory &&
              estadoId &&
              municipios.length > 0 &&
              !municipioLabel &&
              styles.selectorEmpty,
            !estadoId && styles.selectorDisabled,
          ]}
          onPress={() => {
            if (municipios.length > 0) {
              setShowMunicipioModal(true);
            }
          }}
          disabled={!estadoId || municipios.length === 0}
        >
          <Text
            style={
              municipioLabel ? styles.selectorText : styles.selectorPlaceholder
            }
          >
            {!estadoId
              ? "Primero selecciona un estado"
              : isLoading
                ? "Cargando..."
                : municipios.length === 0
                  ? "No hay municipios disponibles"
                  : municipioLabel || "Selecciona un municipio..."}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <SelectionModal
        visible={showMunicipioModal}
        onClose={() => setShowMunicipioModal(false)}
        onSelect={handleMunicipioSelect}
        title="Selecciona un Municipio"
        options={municipios}
        currentValue={municipioId}
        searchable
      />

      {/* Colonia (Opcional) */}
      {showColonia && (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>
              {multiColonia ? "Colonias" : "Colonia"}
            </Text>
            <TouchableOpacity
              style={[styles.selector, !municipioId && styles.selectorDisabled]}
              onPress={() => {
                if (colonias.length > 0) {
                  setShowColoniaModal(true);
                }
              }}
              disabled={!municipioId || colonias.length === 0}
            >
              <Text
                style={
                  (multiColonia ? coloniaLabels.length > 0 : !!coloniaLabel)
                    ? styles.selectorText
                    : styles.selectorPlaceholder
                }
              >
                {!municipioId
                  ? "Primero selecciona un municipio"
                  : isLoading
                    ? "Cargando..."
                    : colonias.length === 0
                      ? "No hay colonias disponibles"
                      : multiColonia
                        ? coloniaLabels.length > 0
                          ? "Agregar otra colonia..."
                          : "Selecciona una o más colonias..."
                        : coloniaLabel || "Selecciona una colonia..."}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {multiColonia && coloniaLabels.length > 0 && (
              <View style={styles.coloniaChipsRow}>
                {coloniaLabels.map((name) => (
                  <View key={name} style={styles.coloniaChip}>
                    <Text style={styles.coloniaChipText} numberOfLines={1}>
                      {name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveColonia(name)}
                      hitSlop={8}
                      style={styles.coloniaChipRemove}
                    >
                      <Ionicons
                        name="close"
                        size={14}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <SelectionModal
            visible={showColoniaModal}
            onClose={() => setShowColoniaModal(false)}
            onSelect={handleColoniaSelect}
            title="Selecciona una Colonia"
            options={colonias}
            currentValue={multiColonia ? "" : coloniaId}
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
  selectorDisabled: {
    opacity: 0.6,
    backgroundColor: COLORS.cardBorder,
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
  coloniaChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  coloniaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primaryTransparent,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  coloniaChipText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "500",
    maxWidth: 160,
  },
  coloniaChipRemove: {
    paddingLeft: 2,
  },
});
