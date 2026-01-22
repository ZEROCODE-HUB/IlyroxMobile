// components/Charts/Chart10_SearchesByNeighborhood.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BaseChartProps, SearchesByNeighborhoodData } from "./types";
import { COLORS } from "../../constants/colors";
import { statsService, FilterOptions } from "../../../services/statsService";

interface Chart10Props extends BaseChartProps {
  filters?: FilterOptions;
}

const Chart10_SearchesByNeighborhood: React.FC<Chart10Props> = ({
  onPress,
  activePoint,
  filters,
}) => {
  const [data, setData] = useState<SearchesByNeighborhoodData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    if (!filters) return;
    setLoading(true);
    const result = await statsService.getSearchesByNeighborhood(filters);
    setData(result);
    setLoading(false);
  };

  // Validar que se haya seleccionado un estado
  if (!filters?.estado || filters.estado === "Todos") {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Interés por Colonia</Text>
        <View style={styles.requirementContainer}>
          <Text style={styles.requirementIcon}>📍</Text>
          <Text style={styles.requirementText}>
            Selecciona un Estado específico en los filtros para ver este gráfico
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
          Analizando búsquedas por colonia...
        </Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Interés por Colonia</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataIcon}>🔍</Text>
          <Text style={styles.noDataText}>
            No hay datos de búsquedas en {filters.estado} para estos filtros
          </Text>
        </View>
      </View>
    );
  }

  const maxSearches = Math.max(...data.map((d) => d.searches), 1);
  const totalSearches = data.reduce((sum, d) => sum + d.searches, 0);

  const locationText =
    filters?.colonia !== "Todos" && filters?.colonia
      ? filters.colonia
      : filters?.ciudad !== "Todos" && filters?.ciudad
        ? filters.ciudad
        : filters.estado;

  return (
    <View style={styles.chartCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.chartTitle}>Interés por Colonia</Text>
          <Text style={styles.chartSubtitle}>
            {locationText} • {data.length} colonias
          </Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeLabel}>Total</Text>
          <Text style={styles.totalBadgeValue}>
            {totalSearches.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Estadísticas resumen */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Más buscada</Text>
          <Text style={styles.statValue}>{maxSearches}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Promedio</Text>
          <Text style={styles.statValue}>
            {Math.round(totalSearches / data.length)}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Colonias</Text>
          <Text style={styles.statValue}>{data.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 20 }}
      >
        <View
          style={[
            styles.chartContainer,
            { width: Math.max(data.length * 100, 340) },
          ]}
        >
          {data.map((d, index) => {
            const isActive =
              activePoint?.chart === "chart10" && activePoint?.index === index;
            const barHeight = (d.searches / maxSearches) * 100;
            const percentage = ((d.searches / totalSearches) * 100).toFixed(1);

            // Determinar color según ranking
            let barColor: string = COLORS.tagPurpleLight;
            if (index === 0)
              barColor = "#8B5CF6"; // Más buscada - púrpura oscuro
            else if (index <= 2)
              barColor = "#A78BFA"; // Top 3 - púrpura medio
            else if (isActive) barColor = COLORS.tagPurple;

            return (
              <TouchableOpacity
                key={`${d.neighborhood}-${index}`}
                style={[styles.barWrapper, isActive && styles.barWrapperActive]}
                onPress={() => onPress?.("chart10", index, d)}
                activeOpacity={0.7}
              >
                {/* Badge de ranking para top 3 */}
                {index < 3 && (
                  <View
                    style={[
                      styles.rankingBadge,
                      {
                        backgroundColor:
                          index === 0
                            ? "#FFD700"
                            : index === 1
                              ? "#C0C0C0"
                              : "#CD7F32",
                      },
                    ]}
                  >
                    <Text style={styles.rankingText}>#{index + 1}</Text>
                  </View>
                )}

                {/* Valor de búsquedas */}
                <View style={styles.valueContainer}>
                  <Text
                    style={[styles.barValue, isActive && styles.barValueActive]}
                  >
                    {d.searches.toLocaleString()}
                  </Text>
                  <Text style={styles.percentageText}>{percentage}%</Text>
                </View>

                {/* Barra */}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${barHeight}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  >
                    {barHeight > 20 && (
                      <Text style={styles.barInnerText}>{d.searches}</Text>
                    )}
                  </View>
                </View>

                {/* Etiqueta de colonia */}
                <Text
                  style={[
                    styles.xAxisLabel,
                    isActive && styles.xAxisLabelActive,
                  ]}
                  numberOfLines={2}
                >
                  {d.neighborhood}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#8B5CF6" }]} />
          <Text style={styles.legendText}>Alta demanda</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#A78BFA" }]} />
          <Text style={styles.legendText}>Media demanda</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: COLORS.tagPurpleLight },
            ]}
          />
          <Text style={styles.legendText}>Baja demanda</Text>
        </View>
      </View>

      {/* Tooltip detallado */}
      {activePoint?.chart === "chart10" && data[activePoint.index] && (
        <View style={styles.tooltip}>
          <View style={styles.tooltipHeader}>
            <View style={styles.tooltipHeaderLeft}>
              <Text style={styles.tooltipRank}>#{activePoint.index + 1}</Text>
              <Text style={styles.tooltipTitle}>
                {data[activePoint.index].neighborhood}
              </Text>
            </View>
          </View>
          <View style={styles.tooltipBody}>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Total búsquedas:</Text>
              <Text style={styles.tooltipValue}>
                {data[activePoint.index].searches.toLocaleString()}
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>% del total:</Text>
              <Text style={styles.tooltipValue}>
                {(
                  (data[activePoint.index].searches / totalSearches) *
                  100
                ).toFixed(2)}
                %
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Posición ranking:</Text>
              <Text style={styles.tooltipValue}>
                {activePoint.index + 1} de {data.length}
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Vs promedio:</Text>
              <Text
                style={[
                  styles.tooltipValue,
                  {
                    color:
                      data[activePoint.index].searches >
                      totalSearches / data.length
                        ? COLORS.success
                        : COLORS.error,
                  },
                ]}
              >
                {data[activePoint.index].searches > totalSearches / data.length
                  ? "+"
                  : ""}
                {(
                  (data[activePoint.index].searches /
                    (totalSearches / data.length) -
                    1) *
                  100
                ).toFixed(1)}
                %
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Nota informativa */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          Las búsquedas representan el número de vistas de propiedades en cada
          colonia. Colonias con más búsquedas indican mayor interés del mercado.
        </Text>
      </View>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 320,
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
  totalBadge: {
    backgroundColor: COLORS.tagPurple,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  totalBadgeLabel: {
    fontSize: 9,
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  totalBadgeValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.white,
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
  chartContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    height: 200,
    gap: 16,
  },
  barWrapper: {
    alignItems: "center",
    width: 90,
    height: "100%",
    justifyContent: "flex-end",
  },
  barWrapperActive: {
    backgroundColor: "#F3E8FF",
    borderRadius: 8,
    padding: 8,
    marginHorizontal: -8,
  },
  rankingBadge: {
    position: "absolute",
    top: 0,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  rankingText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.white,
  },
  valueContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  barValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  barValueActive: {
    fontSize: 14,
    color: COLORS.tagPurple,
  },
  percentageText: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  barTrack: {
    width: 32,
    height: "65%",
    backgroundColor: "#F0F0F0",
    borderRadius: 16,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  barInnerText: {
    fontSize: 9,
    color: COLORS.white,
    fontWeight: "600",
  },
  xAxisLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    height: 32,
    lineHeight: 14,
  },
  xAxisLabelActive: {
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  tooltip: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  tooltipHeader: {
    backgroundColor: "#F3E8FF",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tooltipHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  tooltipRank: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.tagPurple,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flex: 1,
  },
  tooltipBody: {
    padding: 12,
    gap: 10,
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
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#FFF9E6",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: "#8B7500",
    lineHeight: 16,
  },
});

export default Chart10_SearchesByNeighborhood;
