// components/Charts/Chart09_PublishedVsSold.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BaseChartProps, PublishedVsSoldData } from "./types";
import { COLORS } from "../../constants/colors";
import { statsService } from "../../services/statsService";

interface Chart09Props extends BaseChartProps {}

const Chart09_PublishedVsSold: React.FC<Chart09Props> = ({
  onPress,
  activePoint,
  filters,
}) => {
  const [data, setData] = useState<PublishedVsSoldData[]>([]);
  const [loading, setLoading] = useState(false);

  // Validar que se haya seleccionado una ciudad
  const isCitySelected = filters?.ciudad && filters.ciudad !== "Todos";

  useEffect(() => {
    if (isCitySelected) {
      fetchData();
    }
  }, [filters]);

  const fetchData = async () => {
    if (!filters) return;
    setLoading(true);
    const result = await statsService.getPublishedVsSold(filters);
    setData(result);
    setLoading(false);
  };

  if (!isCitySelected) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>
          Propiedades Publicadas vs Vendidas
        </Text>
        <View style={styles.requirementContainer}>
          <Text style={styles.requirementIcon}>🏙️</Text>
          <Text style={styles.requirementText}>
            Selecciona una Ciudad específica en los filtros para ver este
            gráfico
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.chartCard, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Analizando datos de mercado...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>
          Propiedades Publicadas vs Vendidas
        </Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataIcon}>📊</Text>
          <Text style={styles.noDataText}>
            No se encontraron propiedades en {filters?.ciudad} con los filtros
            actuales
          </Text>
        </View>
      </View>
    );
  }

  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.published, d.sold)),
    1
  );
  const totalPublished = data.reduce((sum, d) => sum + d.published, 0);
  const totalSold = data.reduce((sum, d) => sum + d.sold, 0);
  const globalEffectiveness =
    totalPublished > 0 ? (totalSold / totalPublished) * 100 : 0;

  return (
    <View style={styles.chartCard}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.chartTitle}>Publicadas vs Vendidas por Zona</Text>
          <Text style={styles.chartSubtitle}>
            {filters?.ciudad} • {data.length} zonas analizadas
          </Text>
        </View>
      </View>

      {/* Estadisticas globales */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Publicadas</Text>
          <Text style={styles.statValue}>{totalPublished}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Vendidas</Text>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            {totalSold}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Efectividad</Text>
          <Text style={styles.statValue}>
            {globalEffectiveness.toFixed(1)}%
          </Text>
        </View>
      </View>

      {/* Leyenda */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: COLORS.info }]} />
          <Text style={styles.legendText}>Publicadas</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendBox, { backgroundColor: COLORS.success }]}
          />
          <Text style={styles.legendText}>Vendidas</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.warning }]}
          />
          <Text style={styles.legendText}>Efectividad %</Text>
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
            { width: Math.max(data.length * 110, 340) },
          ]}
        >
          {data.map((d, index) => {
            const isActive =
              activePoint?.chart === "chart9" && activePoint?.index === index;
            const publishedHeight = (d.published / maxValue) * 100;
            const soldHeight = (d.sold / maxValue) * 100;

            return (
              <TouchableOpacity
                key={`${d.zone}-${index}`}
                style={[styles.barWrapper, isActive && styles.barWrapperActive]}
                onPress={() => onPress?.("chart9", index, d)}
                activeOpacity={0.7}
              >
                {/* Porcentaje de efectividad */}
                <View style={styles.effectivenessContainer}>
                  <Text
                    style={[
                      styles.effectivenessText,
                      isActive && styles.effectivenessActive,
                    ]}
                  >
                    {d.effectiveness.toFixed(0)}%
                  </Text>
                </View>

                <View style={styles.groupBarTrack}>
                  {/* Barra de Publicadas */}
                  <View style={styles.barColumn}>
                    <Text
                      style={[
                        styles.barValueSmall,
                        isActive && styles.barValueActive,
                      ]}
                    >
                      {d.published}
                    </Text>
                    <View style={styles.barBackground}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${publishedHeight}%`,
                            backgroundColor: isActive
                              ? COLORS.infoDark
                              : COLORS.info,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Barra de Vendidas */}
                  <View style={styles.barColumn}>
                    <Text
                      style={[
                        styles.barValueSmall,
                        isActive && styles.barValueActive,
                      ]}
                    >
                      {d.sold}
                    </Text>
                    <View style={styles.barBackground}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${soldHeight}%`,
                            backgroundColor: isActive
                              ? COLORS.successDark
                              : COLORS.success,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* Etiqueta de zona */}
                <Text
                  style={[
                    styles.xAxisLabel,
                    isActive && styles.xAxisLabelActive,
                  ]}
                  numberOfLines={2}
                >
                  {d.zone}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Tooltip detallado */}
      {activePoint?.chart === "chart9" && data[activePoint.index] && (
        <View style={styles.tooltip}>
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipTitle}>
              {data[activePoint.index].zone}
            </Text>
            <View style={styles.effectivenessBadge}>
              <Text style={styles.effectivenessBadgeText}>
                {data[activePoint.index].effectiveness.toFixed(1)}% efectividad
              </Text>
            </View>
          </View>
          <View style={styles.tooltipBody}>
            <View style={styles.tooltipRow}>
              <View style={styles.tooltipLabelContainer}>
                <View
                  style={[styles.tooltipDot, { backgroundColor: COLORS.info }]}
                />
                <Text style={styles.tooltipLabel}>Publicadas:</Text>
              </View>
              <Text style={[styles.tooltipValue, { color: COLORS.info }]}>
                {data[activePoint.index].published}
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <View style={styles.tooltipLabelContainer}>
                <View
                  style={[
                    styles.tooltipDot,
                    { backgroundColor: COLORS.success },
                  ]}
                />
                <Text style={styles.tooltipLabel}>Vendidas:</Text>
              </View>
              <Text style={[styles.tooltipValue, { color: COLORS.success }]}>
                {data[activePoint.index].sold}
              </Text>
            </View>
            <View style={styles.tooltipDivider} />
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Pendientes de venta:</Text>
              <Text style={styles.tooltipValue}>
                {data[activePoint.index].published -
                  data[activePoint.index].sold}
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>
                % del total {filters?.ciudad}:
              </Text>
              <Text style={styles.tooltipValue}>
                {(
                  (data[activePoint.index].published / totalPublished) *
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
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={styles.infoText}>
          Las barras muestran propiedades publicadas (azul) vs vendidas (verde).
          El porcentaje indica la tasa de efectividad de ventas por zona.
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
  legendRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 200,
    paddingBottom: 24,
    gap: 16,
  },
  barWrapper: {
    alignItems: "center",
    width: 90,
    height: "100%",
  },
  barWrapperActive: {
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    padding: 8,
    marginHorizontal: -8,
  },
  effectivenessContainer: {
    marginBottom: 8,
  },
  effectivenessText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.warning,
  },
  effectivenessActive: {
    fontSize: 14,
    color: COLORS.warningDark,
  },
  groupBarTrack: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: "75%",
    width: "100%",
    justifyContent: "center",
  },
  barColumn: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    flex: 1,
  },
  barValueSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  barValueActive: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  barBackground: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F0F0",
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  xAxisLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: "center",
    width: "100%",
    lineHeight: 14,
  },
  xAxisLabelActive: {
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  tooltip: {
    marginTop: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    overflow: "hidden",
  },
  tooltipHeader: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    flex: 1,
  },
  effectivenessBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  effectivenessBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.white,
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
  tooltipLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  tooltipDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 4,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#FFF9E6",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    alignItems: "flex-start",
    marginTop: 16,
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

export default Chart09_PublishedVsSold;
