import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { FilteredChartProps } from "./types";
import { COLORS } from "../../constants/colors";

interface PropertiesByState {
  estado: string;
  count: number;
  percentage: number;
}

const Chart06_PropertiesByZone: React.FC<FilteredChartProps> = ({
  onPress,
  activePoint,
  properties,
  operationType,
  propertyType,
}) => {
  const propertiesByState: PropertiesByState[] = useMemo(() => {
    if (!properties || properties.length === 0) return [];

    // Count properties by state
    const stateMap = new Map<string, number>();

    properties.forEach((prop: any) => {
      // Filter by operation type
      const ops = Array.isArray(prop.operaciones_propiedad)
        ? prop.operaciones_propiedad
        : [prop.operaciones_propiedad];

      const hasOp = ops.some(
        (o: any) =>
          o?.tipo_operacion?.toLowerCase() === operationType.toLowerCase()
      );
      if (!hasOp) return;

      // Filter by property type
      if (propertyType && propertyType !== "Todos") {
        const pType = prop.tipo || "";
        if (
          !pType.toLowerCase().includes(propertyType.toLowerCase()) &&
          !propertyType.toLowerCase().includes(pType.toLowerCase())
        ) {
          return;
        }
      }

      const estado = (prop.estado || "Sin Estado").trim();
      stateMap.set(estado, (stateMap.get(estado) || 0) + 1);
    });

    const total = Array.from(stateMap.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    return Array.from(stateMap.entries())
      .map(([estado, count]) => ({
        estado,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 states
  }, [properties, operationType, propertyType]);

  const maxCount =
    propertiesByState.length > 0
      ? Math.max(...propertiesByState.map((d) => d.count))
      : 1;

  if (propertiesByState.length === 0) {
    return (
      <View
        style={[styles.chartCard, { height: 200, justifyContent: "center" }]}
      >
        <Text style={{ textAlign: "center", color: COLORS.textSecondary }}>
          No hay propiedades disponibles para los filtros aplicados.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Inventario por Estado</Text>
      <Text style={styles.chartSubtitle}>
        {operationType} • {propertyType}
      </Text>

      <View style={styles.verticalList}>
        {propertiesByState.map((d, index) => {
          const isActive =
            activePoint?.chart === "chart6" && activePoint?.index === index;

          return (
            <TouchableOpacity
              key={d.estado}
              onPress={() => onPress?.("chart6", index, d)}
              activeOpacity={0.7}
            >
              <View style={styles.rowHeader}>
                <Text style={styles.rowLabel}>{d.estado}</Text>
                <View style={styles.rowStats}>
                  <Text
                    style={[
                      styles.rowValueText,
                      isActive && { color: COLORS.primaryDark },
                    ]}
                  >
                    {d.count}
                  </Text>
                  <Text style={styles.rowPercentage}>
                    ({d.percentage.toFixed(1)}%)
                  </Text>
                </View>
              </View>
              <View style={styles.rowTrack}>
                <View
                  style={[
                    styles.rowFill,
                    {
                      width: `${(d.count / maxCount) * 100}%`,
                      backgroundColor: isActive
                        ? COLORS.primaryDark
                        : COLORS.primary,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {activePoint?.chart === "chart6" && activePoint.value && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>{activePoint.value.estado}</Text>
          <Text style={styles.tooltipValue}>{activePoint.value.count}</Text>
          <Text style={styles.tooltipLabel}>
            {activePoint.value.percentage.toFixed(1)}% del total
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  verticalList: {
    gap: 14,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
    flex: 1,
  },
  rowStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowValueText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  rowPercentage: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  rowTrack: {
    width: "100%",
    height: 10,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 5,
    overflow: "hidden",
  },
  rowFill: {
    height: "100%",
    borderRadius: 5,
  },
  tooltip: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120,
  },
  tooltipTitle: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginBottom: 4,
  },
  tooltipValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 2,
  },
  tooltipLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
});

export default Chart06_PropertiesByZone;
