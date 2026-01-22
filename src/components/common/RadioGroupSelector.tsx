/**
 * RadioGroupSelector.tsx
 * Selector de opciones estilo radio button (reemplazo de switches)
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { COLORS } from "../../constants/colors";

interface RadioGroupSelectorProps {
  options: readonly string[] | string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  label?: string;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export default function RadioGroupSelector({
  options,
  selectedValue,
  onSelect,
  label,
  style,
  fullWidth = false,
}: RadioGroupSelectorProps) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.optionsContainer, fullWidth && styles.fullWidth]}>
        {options.map((option) => {
          const isSelected = selectedValue === option;

          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                fullWidth && styles.optionFullWidth,
              ]}
              onPress={() => onSelect(option)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  optionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  fullWidth: {
    flexDirection: "column",
  },
  option: {
    alignItems: "center",
    textAlign: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
    gap: 10,
    flex: 1,
  },
  optionFullWidth: {
    flex: 0,
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryTransparent,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.textDisabled,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  optionTextSelected: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
