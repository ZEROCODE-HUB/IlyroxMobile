import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BaseChartProps, SurfaceVsSaleTimeData } from "./types";
import { COLORS } from "../../constants/colors";
import { statsService } from "../../services/statsService";

interface Chart12Props extends BaseChartProps {}

const Chart12_SurfaceVsSaleTime: React.FC<Chart12Props> = ({
  onPress,
  activePoint,
  filters,
}) => {
  const [data, setData] = useState<SurfaceVsSaleTimeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    if (!filters) return;
    setLoading(true);
    const result = await statsService.getSurfaceVsSaleTime(filters);
    setData(result as any); // Type assertion if needed, or update types
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.chartCard, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Analizando tiempos de venta...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>m² Promedio (Vendidas)</Text>
        <Text style={styles.chartSubtitle}>
          Por tiempo de venta (&lt; 6 meses vs &ge; 6 meses)
        </Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataIcon}>⏱️</Text>
          <Text style={styles.noDataText}>
            No hay datos de ventas disponibles con los filtros actuales
          </Text>
        </View>
      </View>
    );
  }

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.fast, d.slow)),
    1 // Avoid division by zero
  );

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>m² Promedio de Inmuebles Vendidos</Text>
      <Text style={styles.chartSubtitle}>
        Comparativa por tiempos de venta (Rápido vs Lento)
      </Text>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendBox, { backgroundColor: COLORS.success }]}
          />
          <Text style={styles.legendText}>Vendido &lt; 6 meses</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: COLORS.error }]} />
          <Text style={styles.legendText}>Vendido &ge; 6 meses</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 250 }}
      >
        <View
          style={[
            styles.chartContainer,
            { width: Math.max(data.length * 90, 300), gap: 16 },
          ]}
        >
          {data.map((d, index) => {
            const isActive =
              activePoint?.chart === "chart12" && activePoint?.index === index;

            return (
              <TouchableOpacity
                key={index}
                style={styles.barWrapper}
                onPress={() => onPress?.("chart12", index, d)}
                activeOpacity={0.7}
              >
                <View style={styles.groupBarTrack}>
                  {d.fast > 0 ? (
                    <View style={styles.barColumn}>
                      <View style={styles.labelBadge}>
                        <Text style={styles.labelBadgeText}>{d.fast}</Text>
                      </View>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${(d.fast / maxValue) * 100}%`,
                            backgroundColor: isActive
                              ? COLORS.successDark
                              : COLORS.success,
                            width: 24,
                          },
                        ]}
                      />
                    </View>
                  ) : (
                    <View style={[styles.barColumn, { width: 24 }]} />
                  )}

                  {d.slow > 0 ? (
                    <View style={styles.barColumn}>
                      <View
                        style={[
                          styles.labelBadge,
                          { backgroundColor: COLORS.error },
                        ]}
                      >
                        <Text style={styles.labelBadgeText}>{d.slow}</Text>
                      </View>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${(d.slow / maxValue) * 100}%`,
                            backgroundColor: isActive
                              ? COLORS.errorDark
                              : COLORS.error,
                            width: 24,
                          },
                        ]}
                      />
                    </View>
                  ) : (
                    <View style={[styles.barColumn, { width: 24 }]} />
                  )}
                </View>
                <Text style={styles.xAxisLabel} numberOfLines={2}>
                  {d.neighborhood}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {activePoint?.chart === "chart12" && data[activePoint.index] && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>
            {data[activePoint.index].neighborhood}
          </Text>
          <Text style={styles.tooltipValue}>
            Promedio Rápido: {data[activePoint.index].fast} m²
          </Text>
          <Text style={styles.tooltipLabel}>
            Promedio Lento: {data[activePoint.index].slow} m²
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
    marginBottom: 8,
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
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    height: 200,
    paddingRight: 20,
  },
  barWrapper: {
    alignItems: "center",
    width: 80,
    height: "100%",
    justifyContent: "flex-end",
    gap: 8,
  },
  groupBarTrack: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: "80%",
    justifyContent: "center",
    gap: 4,
  },
  barColumn: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  barFill: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  labelBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    minWidth: 24,
    alignItems: "center",
  },
  labelBadgeText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: "bold",
  },
  xAxisLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: "center",
    width: 70,
    height: 30,
  },
  tooltip: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.success,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 140,
  },
  tooltipTitle: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginBottom: 6,
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.success,
    marginBottom: 2,
  },
  tooltipLabel: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: "bold",
  },
});

export default Chart12_SurfaceVsSaleTime;
