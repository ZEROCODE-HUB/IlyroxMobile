import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { LocationChip } from "@/store/propertyFiltersStore";

interface SearchFiltersBarProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  locationChips?: LocationChip[];
  polygonChips?: Array<{ index: number; label: string }>;
  onAddZone?: () => void;
  onRemoveChip?: (id: string) => void;
  onRemovePolygon?: (index: number) => void;
  onBack?: () => void;
}

export const SearchFiltersBar: React.FC<SearchFiltersBarProps> = ({
  hasActiveFilters,
  onClearFilters,
  locationChips = [],
  polygonChips = [],
  onAddZone,
  onRemoveChip,
  onRemovePolygon,
  onBack,
}) => {
  const hasChips = locationChips.length > 0 || polygonChips.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.buttonsRow}>
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 0 }}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        )}
        {onAddZone && (
          <TouchableOpacity
            style={styles.zoneBtn}
            onPress={onAddZone}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={18} color={COLORS.textTertiary} />
            <Text style={styles.zoneBtnText}>¿Dónde busca tu cliente?</Text>
          </TouchableOpacity>
        )}

        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearBtn} onPress={onClearFilters}>
            <Ionicons name="close-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Chips de zonas y ubicaciones */}
      {hasChips && (
        <View style={styles.chipsRow}>
          {polygonChips.map((chip) => (
            <TouchableOpacity
              key={`polygon-${chip.index}`}
              style={[styles.chip, styles.polygonChip]}
              onPress={() => onRemovePolygon?.(chip.index)}
              activeOpacity={0.6}
            >
              <Ionicons name="shapes-outline" size={13} color="#7c3aed" />
              <Text style={[styles.chipLabel, styles.polygonChipLabel]} numberOfLines={1}>
                {chip.label}
              </Text>
              <Ionicons name="close-circle" size={16} color="#7c3aed" />
            </TouchableOpacity>
          ))}
          {locationChips.map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={styles.chip}
              onPress={() => onRemoveChip?.(chip.id)}
              activeOpacity={0.6}
            >
              <Ionicons
                name={
                  chip.type === "estado"
                    ? "map-outline"
                    : chip.type === "municipio"
                      ? "business-outline"
                      : "location-outline"
                }
                size={13}
                color={COLORS.primary}
              />
              <Text style={styles.chipLabel} numberOfLines={1}>
                {chip.label}
              </Text>
              <Ionicons name="close-circle" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 10,
    elevation: 10,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  zoneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    backgroundColor: COLORS.white,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  zoneBtnText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  clearBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: COLORS.errorLight,
  },

  // Chips
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    borderWidth: 1.5,
    borderColor: COLORS.primaryLight,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    maxWidth: 120,
  },

  polygonChip: {
    backgroundColor: "#f5f3ff",
    borderColor: "#c4b5fd",
  },
  polygonChipLabel: {
    color: "#7c3aed",
  },
});
