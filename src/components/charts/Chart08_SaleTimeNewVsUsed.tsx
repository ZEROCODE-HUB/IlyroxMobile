// components/Charts/Chart08_SaleTimeNewVsUsed.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BaseChartProps, SaleTimeData } from "./types";
import { COLORS } from "../../constants/colors";
import { statsService } from "../../services/statsService";

const Chart08_SaleTimeNewVsUsed: React.FC<BaseChartProps> = ({
  onPress,
  activePoint,
  filters,
}) => {
  const [data, setData] = useState<SaleTimeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    if (!filters) return;
    setLoading(true);
    const result = await statsService.getSaleTimeNewVsUsed(filters);
    setData(result);
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
        <Text style={styles.chartTitle}>Tiempo Promedio de Venta</Text>
        <Text style={styles.chartSubtitle}>Nuevos vs Usados</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataIcon}>⏱️</Text>
          <Text style={styles.noDataText}>
            No hay datos de ventas completadas para estos filtros
          </Text>
          <Text style={styles.noDataHint}>
            Nota: Solo se muestran propiedades con fecha de venta registrada
          </Text>
        </View>
      </View>
    );
  }

  const maxDays = Math.max(...data.map((d) => d.avgDays), 1);
  const totalProperties = data.reduce((sum, d) => sum + d.count, 0);

  // Función para formatear días
  const formatDays = (days: number): string => {
    if (days < 30) {
      return `${days} días`;
    } else if (days < 365) {
      const months = Math.round(days / 30);
      return `${months} ${months === 1 ? "mes" : "meses"}`;
    } else {
      const years = (days / 365).toFixed(1);
      return `${years} años`;
    }
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
          <Text style={styles.chartTitle}>Tiempo Promedio de Venta</Text>
          <Text style={styles.chartSubtitle}>
            Ubicación: {locationText} | Tipo:{" "}
            {filters?.tipoPropiedad !== "Todos"
              ? filters?.tipoPropiedad
              : "Todas"}{" "}
            • Días promedio
          </Text>
        </View>
      </View>

      {/* Estadísticas resumen */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Ventas</Text>
          <Text style={styles.statValue}>{totalProperties}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Más Rápido</Text>
          <Text style={styles.statValue}>
            {Math.min(...data.map((d) => d.avgDays))}d
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Más Lento</Text>
          <Text style={styles.statValue}>
            {Math.max(...data.map((d) => d.avgDays))}d
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        {data.map((d, index) => {
          const isActive =
            activePoint?.chart === "chart8" && activePoint?.index === index;
          const barHeight = (d.avgDays / maxDays) * 100;
          const isNew = d.category === "Nuevas";

          return (
            <TouchableOpacity
              key={index}
              style={styles.barWrapper}
              onPress={() => onPress?.("chart8", index, d)}
              activeOpacity={0.7}
            >
              {/* Etiqueta superior con días */}
              <View style={styles.topLabel}>
                <Text
                  style={[
                    styles.topLabelText,
                    isActive && styles.topLabelActive,
                  ]}
                >
                  {d.avgDays}
                </Text>
                <Text style={styles.topLabelSubtext}>días</Text>
              </View>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${barHeight}%`,
                      backgroundColor: isActive
                        ? isNew
                          ? COLORS.primaryDark
                          : COLORS.warningDark
                        : isNew
                          ? COLORS.primary
                          : COLORS.warning,
                    },
                  ]}
                >
                  {barHeight > 15 && (
                    <Text style={styles.barValueInside}>{d.count}</Text>
                  )}
                </View>
              </View>

              {/* Etiqueta inferior con categoría */}
              <View style={styles.bottomLabel}>
                <View
                  style={[
                    styles.categoryBadge,
                    {
                      backgroundColor: isNew ? COLORS.primary : COLORS.warning,
                    },
                  ]}
                >
                  <Text style={styles.categoryBadgeText}>{d.category}</Text>
                </View>
                <Text style={styles.countText}>
                  {d.count} {d.count === 1 ? "venta" : "ventas"}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.primary }]}
          />
          <Text style={styles.legendText}>Propiedades Nuevas (0 años)</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS.warning }]}
          />
          <Text style={styles.legendText}>Propiedades Usadas (1+ años)</Text>
        </View>
      </View>

      {/* Tooltip detallado */}
      {activePoint?.chart === "chart8" && data[activePoint.index] && (
        <View style={styles.tooltip}>
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipTitle}>
              Propiedades {data[activePoint.index].category}
            </Text>
          </View>
          <View style={styles.tooltipBody}>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Tiempo promedio:</Text>
              <Text style={styles.tooltipValue}>
                {formatDays(data[activePoint.index].avgDays)}
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>En días:</Text>
              <Text style={styles.tooltipValue}>
                {data[activePoint.index].avgDays} días
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Total ventas:</Text>
              <Text style={styles.tooltipValue}>
                {data[activePoint.index].count}
              </Text>
            </View>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>% del total:</Text>
              <Text style={styles.tooltipValue}>
                {(
                  (data[activePoint.index].count / totalProperties) *
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
          El tiempo se calcula desde la fecha de publicación hasta la fecha de
          venta registrada
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
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
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
  noDataHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 20,
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
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
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
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 220,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  barWrapper: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    maxWidth: 150,
  },
  topLabel: {
    alignItems: "center",
    marginBottom: 8,
  },
  topLabelText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  topLabelActive: {
    color: COLORS.primary,
  },
  topLabelSubtext: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  barTrack: {
    width: "80%",
    height: "65%",
    justifyContent: "flex-end",
    backgroundColor: COLORS.dividerGray,
    borderRadius: 12,
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  barValueInside: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
  bottomLabel: {
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  countText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.dividerGray,
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
    backgroundColor: "#E3F2FD",
    padding: 12,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
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

export default Chart08_SaleTimeNewVsUsed;
