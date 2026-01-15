import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { BaseChartProps } from "./types";
import { COLORS } from "../../constants/colors";
import { chartService } from "../../services/chartService";
import currencyConverter from "../../utils/currencyConverter";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface Chart03Props extends BaseChartProps {}

const Chart03_SearchVsProperties: React.FC<Chart03Props> = ({ onPress }) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [lineData1, setLineData1] = useState<any[]>([]); // Construcción
  const [lineData2, setLineData2] = useState<any[]>([]); // Terreno
  const [maxValue, setMaxValue] = useState(0);
  const [maxM2Value, setMaxM2Value] = useState(0);
  const [valueCoin, setValueCoin] = useState<number>(0);

  // Filters
  const [operationType, setOperationType] = useState<"venta" | "renta">(
    "venta"
  );
  const [localActiveIndex, setLocalActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      const value = await currencyConverter();
      setValueCoin(value);
    };
    fetchRate();
  }, []);

  const EXCHANGE_RATE = valueCoin || 18;

  // Define ranges based on operation
  const getRanges = (op: "venta" | "renta") => {
    if (op === "venta") {
      return [
        { label: "0-10k", min: 0, max: 1000000 },
        { label: "10k-20k", min: 1000000, max: 3000000 },
        { label: "20k-30k", min: 3000000, max: 5000000 },
        { label: "30k-40k", min: 5000000, max: 8000000 },
        { label: "40k-50k", min: 8000000, max: 12000000 },
        { label: "50k+", min: 12000000, max: 999999999 },
      ];
    } else {
      return [
        { label: "0-10k", min: 0, max: 10000 },
        { label: "10k-20k", min: 10000, max: 20000 },
        { label: "20k-30k", min: 20000, max: 30000 },
        { label: "30k-40k", min: 30000, max: 40000 },
        { label: "40k-50k", min: 40000, max: 50000 },
        { label: "50k+", min: 50000, max: 999999999 },
      ];
    }
  };

  const handleBarPress = React.useCallback((index: number) => {
    setLocalActiveIndex(index);
  }, []);

  const renderTooltip = React.useCallback((item: any) => {
    return (
      <View style={styles.tooltipContainer}>
        <Text style={styles.tooltipText}>{item.value}</Text>
      </View>
    );
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [propertiesData, searchesData] = await Promise.all([
        chartService.getDataChart(true),
        chartService.getBusquedas(),
      ]);

      if (!propertiesData || !searchesData) return;

      const ranges = getRanges(operationType);
      const acc = ranges.map((r) => ({
        ...r,
        searches: 0,
        properties: 0,
        sumConst: 0,
        countConst: 0,
        sumLand: 0,
        countLand: 0,
      }));

      // 1. Process Properties
      propertiesData.forEach((item: any) => {
        const ops = Array.isArray(item.operaciones_propiedad)
          ? item.operaciones_propiedad
          : [item.operaciones_propiedad];

        const op = ops.find(
          (o: any) =>
            o?.tipo_operacion?.toLowerCase() === operationType.toLowerCase()
        );

        if (op) {
          let price = op.precio || 0;
          if (op.moneda === "USD") price *= EXCHANGE_RATE;

          const rangeIndex = ranges.findIndex(
            (r) => price >= r.min && price < r.max
          );
          if (rangeIndex !== -1) {
            acc[rangeIndex].properties += 1;
          }
        }
      });

      // 2. Process Searches - Updated Fields
      searchesData.forEach((item: any) => {
        const searchOp = item.tipo_operacion?.toLowerCase();
        if (searchOp && searchOp !== operationType.toLowerCase()) {
          return;
        }

        let sMinPrice = parseFloat(item.precio_min) || 0;
        let sMaxPrice = parseFloat(item.precio_max) || sMinPrice;

        if (item.moneda === "USD") {
          sMinPrice *= EXCHANGE_RATE;
          sMaxPrice *= EXCHANGE_RATE;
        }

        const avgPrice = (sMinPrice + sMaxPrice) / 2;
        const rangeIndex = ranges.findIndex(
          (r) => avgPrice >= r.min && avgPrice < r.max
        );

        if (rangeIndex !== -1) {
          acc[rangeIndex].searches += 1;

          // Use metros_construccion and metros_terreno directly
          // Handle ranges if stored as min/max in other fields, but prioritizing these as per request
          let m2Const = parseFloat(item.metros_construccion) || 0;
          if (m2Const === 0) {
            const minC = parseFloat(item.min_m2_construccion) || 0;
            const maxC = parseFloat(item.max_m2_construccion) || minC;
            m2Const = (minC + maxC) / 2;
          }

          let m2Land = parseFloat(item.metros_terreno) || 0;
          if (m2Land === 0) {
            const minT = parseFloat(item.min_m2_terreno) || 0;
            const maxT = parseFloat(item.max_m2_terreno) || minT;
            m2Land = (minT + maxT) / 2;
          }

          if (m2Const > 0) {
            acc[rangeIndex].sumConst += m2Const;
            acc[rangeIndex].countConst += 1;
          }
          if (m2Land > 0) {
            acc[rangeIndex].sumLand += m2Land;
            acc[rangeIndex].countLand += 1;
          }
        }
      });

      // 3. Format Data
      const bars = [];
      const line1 = [];
      const line2 = [];
      let maxY = 0;
      let maxM2 = 0;

      acc.forEach((d, idx) => {
        if (d.searches > maxY) maxY = d.searches;
        if (d.properties > maxY) maxY = d.properties;

        const avgConst = d.countConst > 0 ? d.sumConst / d.countConst : 0;
        const avgLand = d.countLand > 0 ? d.sumLand / d.countLand : 0;

        if (avgConst > maxM2) maxM2 = avgConst;
        if (avgLand > maxM2) maxM2 = avgLand;

        bars.push({
          value: d.searches,
          label: d.label,
          spacing: 2,
          labelWidth: 50,
          labelTextStyle: { color: COLORS.textTertiary, fontSize: 10 },
          frontColor: COLORS.warning,
          onPress: () => handleBarPress(idx * 2),
          topLabelComponent: () =>
            localActiveIndex === idx * 2 ? (
              <View style={{ alignItems: "center", marginBottom: 5 }}>
                <Text style={styles.topLabelValue}>{d.searches}</Text>
                <Text style={styles.topLabelText}>Búsquedas</Text>
              </View>
            ) : null,
        });
        bars.push({
          value: d.properties,
          frontColor: COLORS.error,
          onPress: () => handleBarPress(idx * 2 + 1),
          topLabelComponent: () =>
            localActiveIndex === idx * 2 + 1 ? (
              <View style={{ alignItems: "center", marginBottom: 5 }}>
                <Text style={styles.topLabelValue}>{d.properties}</Text>
                <Text style={styles.topLabelText}>Propiedades</Text>
              </View>
            ) : null,
        });

        line1.push({
          value: avgConst,
          dataPointText: avgConst > 0 ? avgConst.toFixed(0) : "",
          isSecondary: true,
        });
        line2.push({
          value: avgLand,
          dataPointText: avgLand > 0 ? avgLand.toFixed(0) : "",
          isSecondary: true,
        });
      });

      setMaxValue(maxY > 0 ? maxY * 1.5 : 10);
      setMaxM2Value(maxM2 > 0 ? maxM2 * 1.2 : 200);
      setChartData(bars);
      setLineData1(line1);
      setLineData2(line2);
    } catch (error) {
      console.error("Error Chart 03:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [operationType, valueCoin, localActiveIndex]);

  if (loading) {
    return (
      <View
        style={[styles.chartCard, { height: 300, justifyContent: "center" }]}
      >
        <Text style={{ textAlign: "center" }}>Cargando...</Text>
      </View>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <View
        style={[styles.chartCard, { height: 300, justifyContent: "center" }]}
      >
        <Text style={{ textAlign: "center", color: COLORS.textSecondary }}>
          No hay datos disponibles para la selección actual.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Demanda vs Oferta (Por Precio)</Text>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {(["venta", "renta"] as const).map((op) => (
            <TouchableOpacity
              key={op}
              style={[
                styles.filterBtn,
                operationType === op && styles.filterBtnActive,
              ]}
              onPress={() => setOperationType(op)}
            >
              <Text
                style={[
                  styles.filterText,
                  operationType === op && styles.filterTextActive,
                ]}
              >
                {op.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 320, overflow: "visible" }}>
        <BarChart
          data={chartData}
          barWidth={18}
          spacing={35}
          roundedTop
          height={240}
          xAxisThickness={1}
          xAxisColor={COLORS.cardBorder}
          yAxisThickness={0}
          yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
          noOfSections={5}
          maxValue={maxValue}
          isAnimated
          animationDuration={800}
          // Tooltip and labels
          renderTooltip={(item: any, index: number) => {
            return (
              <View style={styles.tooltipContainer}>
                <Text style={styles.tooltipText}>{item.value}</Text>
              </View>
            );
          }}
          leftShiftForTooltip={8}
          // Lines Overlay
          showLine
          lineData={lineData1} // Blue: Construction
          lineData2={lineData2} // Yellow: Land
          lineConfig={{
            color: "#2196F3", // Blue
            thickness: 6,
            curved: false,
            hideDataPoints: false,
            dataPointsColor: "#2196F3",
            dataPointsRadius: 5,
            isSecondary: true,
          }}
          lineConfig2={{
            color: "#FFEB3B", // Yellow
            thickness: 6,
            curved: false,
            hideDataPoints: false,
            dataPointsColor: "#FFEB3B",
            dataPointsRadius: 5,
            isSecondary: true,
          }}
          // Second Axis for m2
          secondaryYAxis={{
            maxValue: maxM2Value,
            noOfSections: 5,
            yAxisTextStyle: { color: COLORS.textSecondary, fontSize: 10 },
            showYAxisIndices: true,
            yAxisColor: COLORS.cardBorder,
            yAxisLabelSuffix: " m²",
          }}
        />
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.box, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.lText}>Búsquedas</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.box, { backgroundColor: COLORS.error }]} />
          <Text style={styles.lText}>Propiedades</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.line, { backgroundColor: "#2196F3" }]} />
          <Text style={styles.lText}>m² Const.</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.line, { backgroundColor: "#FFEB3B" }]} />
          <Text style={styles.lText}>m² Terreno</Text>
        </View>
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
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  filterContainer: {
    gap: 8,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: "600",
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  box: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  line: {
    width: 12,
    height: 3,
    borderRadius: 1,
  },
  lText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  tooltipContainer: {
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },
  topLabelValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  topLabelText: {
    fontSize: 8,
    color: COLORS.textSecondary,
  },
});

export default Chart03_SearchVsProperties;
