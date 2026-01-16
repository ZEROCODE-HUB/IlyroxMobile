import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { BaseChartProps, PriceByRoomsData } from "./types";
import { COLORS } from "../../constants/colors";
import { statsService } from "../../services/statsService";

interface Chart13Props extends BaseChartProps {}

const Chart13_PriceByRooms: React.FC<Chart13Props> = ({
  onPress,
  activePoint,
  filters,
}) => {
  const [data, setData] = useState<PriceByRoomsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    if (!filters) return;
    setLoading(true);
    const result = await statsService.getPriceByRooms(filters);
    setData(result);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.chartCard, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          Analizando precios por habitaciones...
        </Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Precio vs Habitaciones (Vendidas)</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataIcon}>🛏️</Text>
          <Text style={styles.noDataText}>
            No hay propiedades vendidas con información de habitaciones para
            estos filtros
          </Text>
        </View>
      </View>
    );
  }

  const maxPrice = Math.max(...data.map((d) => d.avgPrice), 1);

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Precio vs Habitaciones (Vendidas)</Text>
      <Text style={styles.chartSubtitle}>
        Precio promedio por número de habitaciones
      </Text>

      <View style={styles.chartContainer}>
        {data.map((d, index) => (
          <TouchableOpacity
            key={index}
            style={styles.barWrapper}
            onPress={() => onPress?.("chart13", index, d)}
            activeOpacity={0.7}
          >
            <Text style={styles.barValue}>${d.avgPrice.toLocaleString()}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: `${(d.avgPrice / maxPrice) * 100}%`,
                    backgroundColor:
                      activePoint?.chart === "chart13" &&
                      activePoint?.index === index
                        ? COLORS.successDark
                        : COLORS.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.xAxisLabel}>{d.rooms} Hab.</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activePoint?.chart === "chart13" && data[activePoint.index] && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>Precio Promedio</Text>
          <Text style={styles.tooltipValue}>
            ${data[activePoint.index].avgPrice.toLocaleString()}
          </Text>
          <Text style={styles.tooltipLabel}>
            {data[activePoint.index].rooms} habitación
            {data[activePoint.index].rooms > 1 ? "es" : ""}
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
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 200,
    paddingHorizontal: 8,
  },
  barWrapper: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    gap: 6,
  },
  barTrack: {
    width: "80%",
    height: "75%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "100%",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  barValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.success,
    marginBottom: 4,
  },
  xAxisLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "500",
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
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  tooltipValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.success,
    marginBottom: 2,
  },
  tooltipLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});

export default Chart13_PriceByRooms;
