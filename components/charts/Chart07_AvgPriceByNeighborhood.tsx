// components/Charts/Chart07_AvgPriceByNeighborhood.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { BaseChartProps, AvgPriceByNeighborhoodData } from "./types";
import { COLORS } from "../../constants/colors";
import { statsService } from "../../services/statsService";

const Chart07_AvgPriceByNeighborhood: React.FC<BaseChartProps> = ({
  onPress,
  activePoint,
  filters,
}) => {
  const [data, setData] = useState<AvgPriceByNeighborhoodData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    if (!filters) return;
    setLoading(true);
    const result = await statsService.getAvgPriceByNeighborhood(filters);
    setData(result);
    setLoading(false);
  };

  // Validar que se haya seleccionado un estado
  const isStateSelected = filters?.estado && filters.estado !== "Todos";

  if (!isStateSelected) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Precio Promedio por Colonia</Text>
        <View style={styles.requirementContainer}>
          <Text style={styles.requirementIcon}>📍</Text>
          <Text style={styles.requirementText}>
            Selecciona un Estado en los filtros para ver el precio promedio por
            colonia
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.chartCard, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          Analizando precios por colonia...
        </Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Precio Promedio por Colonia</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataIcon}>📊</Text>
          <Text style={styles.noDataText}>
            No hay suficientes datos de propiedades para mostrar este gráfico
          </Text>
        </View>
      </View>
    );
  }

  const maxPrice = Math.max(...data.map((d) => d.avgPrice));
  const minPrice = Math.min(...data.map((d) => d.avgPrice));
  const totalProperties = data.reduce((sum, d) => sum + d.count, 0);

  // Formatear precio en formato compacto
  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price.toLocaleString()}`;
  };

  const locationText =
    filters?.colonia !== "Todos"
      ? filters?.colonia
      : filters?.ciudad !== "Todos"
      ? filters?.ciudad
      : filters?.estado !== "Todos"
      ? filters?.estado
      : "México";

  return (
    <View style={styles.chartCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.chartTitle}>Precio Promedio por Colonia</Text>
          <Text style={styles.chartSubtitle}>
            Ubicación: {locationText} | Tipo:{" "}
            {filters?.tipoPropiedad !== "Todos"
              ? filters?.tipoPropiedad
              : "Todas"}{" "}
            • {totalProperties} propiedades
          </Text>
        </View>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: COLORS.success }]}
            />
            <Text style={styles.legendText}>Precio Avg</Text>
          </View>
        </View>
      </View>

      {/* Estadísticas resumen */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Más cara</Text>
          <Text style={styles.statValue}>{formatPrice(maxPrice)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Más económica</Text>
          <Text style={styles.statValue}>{formatPrice(minPrice)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Colonias</Text>
          <Text style={styles.statValue}>{data.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <View style={styles.verticalList}>
          {data.map((d, index) => {
            const isActive =
              activePoint?.chart === "chart7" && activePoint?.index === index;
            const barWidth = (d.avgPrice / maxPrice) * 100;
            const rank = index + 1;

            return (
              <TouchableOpacity
                key={`${d.neighborhood}-${index}`}
                onPress={() => onPress?.("chart7", index, d)}
                activeOpacity={0.7}
                style={[
                  styles.barContainer,
                  isActive && styles.barContainerActive,
                ]}
              >
                <View style={styles.rowHeader}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{rank}</Text>
                  </View>
                  <View style={styles.neighborhoodInfo}>
                    <Text
                      style={[
                        styles.rowLabel,
                        isActive && styles.rowLabelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {d.neighborhood}
                    </Text>
                    <Text style={styles.countText}>
                      {d.count} {d.count === 1 ? "propiedad" : "propiedades"}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.rowValueText,
                      isActive && styles.rowValueActive,
                    ]}
                  >
                    {formatPrice(d.avgPrice)}
                  </Text>
                </View>
                <View style={styles.rowTrack}>
                  <View
                    style={[
                      styles.rowFill,
                      {
                        width: `${barWidth}%`,
                        backgroundColor: isActive
                          ? COLORS.successDark
                          : COLORS.success,
                      },
                    ]}
                  >
                    {barWidth > 20 && (
                      <Text style={styles.barLabel}>
                        {barWidth.toFixed(0)}%
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {activePoint?.chart === "chart7" && data[activePoint.index] && (
        <View style={styles.tooltip}>
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipTitle}>
              #{activePoint.index + 1} {data[activePoint.index].neighborhood}
            </Text>
          </View>
          <View style={styles.tooltipBody}>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Precio Promedio:</Text>
              <Text style={styles.tooltipValue}>
                ${data[activePoint.index].avgPrice.toLocaleString("es-MX")}
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Total Propiedades:</Text>
              <Text style={styles.tooltipValue}>
                {data[activePoint.index].count}
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>% del máximo:</Text>
              <Text style={styles.tooltipValue}>
                {((data[activePoint.index].avgPrice / maxPrice) * 100).toFixed(
                  1
                )}
                %
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

interface Chart07Props extends BaseChartProps {}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  requirementContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  requirementIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  requirementText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
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
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  legendContainer: {
    flexDirection: "row",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  scrollView: {
    maxHeight: 500,
  },
  verticalList: {
    gap: 12,
  },
  barContainer: {
    padding: 12,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  barContainerActive: {
    backgroundColor: "#F0F9FF",
    borderColor: COLORS.success,
    elevation: 2,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  rankBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 36,
    alignItems: "center",
  },
  rankText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.white,
  },
  neighborhoodInfo: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginBottom: 2,
  },
  rowLabelActive: {
    color: COLORS.successDark,
  },
  countText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  rowValueText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  rowValueActive: {
    color: COLORS.successDark,
  },
  rowTrack: {
    height: 12,
    backgroundColor: "#E8E8E8",
    borderRadius: 6,
    overflow: "hidden",
  },
  rowFill: {
    height: "100%",
    borderRadius: 6,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  barLabel: {
    fontSize: 9,
    color: COLORS.white,
    fontWeight: "600",
  },
  tooltip: {
    marginTop: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    overflow: "hidden",
  },
  tooltipHeader: {
    backgroundColor: "#E8F5E9",
    padding: 12,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.successDark,
  },
  tooltipBody: {
    padding: 12,
    gap: 8,
  },
  tooltipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tooltipLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tooltipValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
});

export default Chart07_AvgPriceByNeighborhood;
