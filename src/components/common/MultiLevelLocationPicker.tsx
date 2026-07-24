import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import CascadeLocationSelector from "./CascadeLocationSelector";

export interface LocationChipItem {
  level: "estado" | "municipio" | "colonia";
  estado: string;
  municipio?: string;
  colonia?: string;
  label: string;
  latitud?: number;
  longitud?: number;
}

interface InternalLocation {
  estado: string;
  ciudad: string;
  municipio: string;
  colonia: string;
  latitud?: number;
  longitud?: number;
}

interface MultiLevelLocationPickerProps {
  value: LocationChipItem[];
  onChange: (next: LocationChipItem[]) => void;
}

function buildLabel(c: { estado: string; municipio?: string; colonia?: string }): string {
  return [c.colonia, c.municipio, c.estado].filter(Boolean).join(", ");
}

function chipKey(c: LocationChipItem): string {
  return `${c.level}:${c.estado}|${c.municipio ?? ""}|${c.colonia ?? ""}`;
}

const ICON_BY_LEVEL: Record<LocationChipItem["level"], keyof typeof Ionicons.glyphMap> = {
  estado: "map-outline",
  municipio: "business-outline",
  colonia: "location-outline",
};

export const MultiLevelLocationPicker: React.FC<MultiLevelLocationPickerProps> = ({
  value,
  onChange,
}) => {
  const [current, setCurrent] = useState<InternalLocation | null>(null);
  const [resetKey, setResetKey] = useState(0);

  // Detect cuando la selección actual tiene al menos un nivel seleccionado
  const hasSelection = !!current && !!current.estado;

  const handleAdd = (loc: InternalLocation | null = current) => {
    if (!loc || !loc.estado) return;

    let level: LocationChipItem["level"] = "estado";
    if (loc.colonia) level = "colonia";
    else if (loc.municipio) level = "municipio";

    const chip: LocationChipItem = {
      level,
      estado: loc.estado,
      municipio: loc.municipio || undefined,
      colonia: loc.colonia || undefined,
      label: buildLabel(loc),
      latitud: loc.latitud,
      longitud: loc.longitud,
    };

    const key = chipKey(chip);
    if (value.some((c) => chipKey(c) === key)) {
      // Ya existe, no duplicar
      setCurrent(null);
      setResetKey((k) => k + 1);
      return;
    }

    onChange([...value, chip]);
    setCurrent(null);
    setResetKey((k) => k + 1);
  };

  const handleRemove = (key: string) => {
    onChange(value.filter((c) => chipKey(c) !== key));
  };

  return (
    <View>
      {value.length > 0 && (
        <View style={styles.chipsRow}>
          {value.map((chip) => {
            const key = chipKey(chip);
            return (
              <View key={key} style={styles.chip}>
                <Ionicons
                  name={ICON_BY_LEVEL[chip.level]}
                  size={14}
                  color={COLORS.primary}
                />
                <Text style={styles.chipText} numberOfLines={1}>
                  {chip.label}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemove(key)}
                  hitSlop={8}
                  style={styles.removeBtn}
                >
                  <Ionicons name="close" size={14} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <CascadeLocationSelector
        key={resetKey}
        isMandatory={false}
        showColonia={true}
        onChange={(data) => {
          setCurrent(data);
          // Auto-agregar al tocar la sugerencia (sin tener que tocar el botón).
          // Diferido para no re-montar el cascade mientras corre su handler.
          if (data && data.estado) {
            setTimeout(() => handleAdd(data), 0);
          }
        }}
      />

      <TouchableOpacity
        style={[styles.addBtn, !hasSelection && styles.addBtnDisabled]}
        onPress={() => handleAdd()}
        disabled={!hasSelection}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
        <Text style={styles.addBtnText}>Agregar ubicación</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
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
  chipText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "500",
    maxWidth: 200,
  },
  removeBtn: {
    paddingLeft: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  addBtnDisabled: {
    opacity: 0.4,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 14,
  },
});
