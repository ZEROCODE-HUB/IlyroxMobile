import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AppInput } from "@/design-system/components/AppInput";
import { COLORS } from "@/constants/colors";
import { usePropertyFiltersStore } from "@/store/propertyFiltersStore";
import { useShallow } from "zustand/react/shallow";

interface PriceSectionProps {
  handleCurrencyChange: (text: string, setter: (val: string) => void) => void;
}

export const PriceSection: React.FC<PriceSectionProps> = ({
  handleCurrencyChange,
}) => {
  const { precioMin, precioMax, moneda } = usePropertyFiltersStore(
    useShallow((s) => ({
      precioMin: s.filters.precioMin,
      precioMax: s.filters.precioMax,
      moneda: s.filters.moneda,
    })),
  );
  const onUpdateFilter = usePropertyFiltersStore((s) => s.updateFilter);
  return (
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
                moneda === curr && styles.currencyBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.currencyText,
                  moneda === curr && styles.currencyTextActive,
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
          <Text style={styles.label}>Mínimo ({moneda})</Text>
          <AppInput
            value={precioMin}
            onChangeText={(val) =>
              handleCurrencyChange(val, (v) => onUpdateFilter("precioMin", v))
            }
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
        <View style={styles.halfWidth}>
          <Text style={styles.label}>Máximo ({moneda})</Text>
          <AppInput
            value={precioMax}
            onChangeText={(val) =>
              handleCurrencyChange(val, (v) => onUpdateFilter("precioMax", v))
            }
            keyboardType="numeric"
            placeholder="Sin límite"
          />
        </View>
      </View>
      {(() => {
        const min = parseFloat(precioMin.replace(/,/g, "")) || 0;
        const max = parseFloat(precioMax.replace(/,/g, "")) || 0;
        if (min > 0 && max > 0 && min > max) {
          return (
            <Text style={styles.priceWarning}>
              El precio mínimo no puede ser mayor al máximo
            </Text>
          );
        }
        return null;
      })()}
    </View>
  );
};

const styles = StyleSheet.create({
  formSection: {
    marginBottom: 15,
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
    color: COLORS.primaryDark,
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
  priceWarning: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: -12,
    marginBottom: 8,
  },
});
