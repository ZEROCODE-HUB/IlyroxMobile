import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { FilteredChartProps, PricePerM2Data } from "./types";
import { COLORS } from "../../constants/colors";
import currencyConverter from "../../utils/currencyConverter";

const Chart01_PricePerM2: React.FC<FilteredChartProps> = ({
  onPress,
  activePoint,
  properties,
  operationType,
}) => {
  const [priceType, setPriceType] = useState<
    "total" | "terrain" | "construction"
  >("total");
  const [localActiveIndex, setLocalActiveIndex] = useState<number | null>(null);
  const [processedData, setProcessedData] = useState<PricePerM2Data[]>([]);
  const [loading, setLoading] = useState(false);
  const [valueCoin, setValueCoin] = useState<number>(0);

  useEffect(() => {
    const fetchRate = async () => {
      const value = await currencyConverter();
      setValueCoin(value);
    };
    fetchRate();
  }, []);

  const EXCHANGE_RATE = valueCoin || 18;

  useEffect(() => {
    const processData = () => {
      setLoading(true);
      if (!properties || properties.length === 0) {
        setProcessedData([]);
        setLoading(false);
        return;
      }

      const groups: {
        [key: string]: {
          total: number[];
          terrain: number[];
          construction: number[];
        };
      } = {};

      const months = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];

      properties.forEach((item: any) => {
        if (!item.created_at) return;

        const date = new Date(item.created_at);
        const label = `${months[date.getMonth()]} ${date.getFullYear()}`;

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

          if (!groups[label]) {
            groups[label] = { total: [], terrain: [], construction: [] };
          }

          const m2Terreno = item.metros_cuadrados_terreno || 0;
          const m2Construccion = item.metros_cuadrados_construccion || 0;
          const m2Suma = m2Terreno + m2Construccion;

          // Precio por m2 Total (promedio de ambos o lo que esté disponible)
          const m2Total = m2Suma;
          if (m2Total > 0) {
            groups[label].total.push(price / m2Total);
          }

          if (m2Terreno > 0) {
            groups[label].terrain.push(price / m2Terreno);
          }

          if (m2Construccion > 0) {
            groups[label].construction.push(price / m2Construccion);
          }
        }
      });

      const processed = Object.keys(groups).map((label) => {
        const g = groups[label];
        const avg = (arr: number[]) =>
          arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

        const [mStr, yStr] = label.split(" ");
        const monthIdx = months.indexOf(mStr);
        const year = parseInt(yStr);

        return {
          month: label,
          total: avg(g.total),
          terrain: avg(g.terrain),
          construction: avg(g.construction),
          sortDate: new Date(year, monthIdx, 1),
        };
      });

      // Ordenar cronológicamente
      processed.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

      // Mapear al tipo final
      const finalData: PricePerM2Data[] = processed.map((p) => ({
        month: p.month,
        total: Math.round(p.total),
        terrain: Math.round(p.terrain),
        construction: Math.round(p.construction),
      }));

      setProcessedData(finalData);
      setLoading(false);
    };

    processData();
  }, [properties, operationType, EXCHANGE_RATE]); // Re-run when props change

  const formatPrice = (price: number): string => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}K`;
    }
    return `$${Math.round(price)}`;
  };

  const formatMonth = (monthYear: string): string => {
    const [month, year] = monthYear.split(" ");
    const monthMap: { [key: string]: string } = {
      Ene: "Enero",
      Feb: "Febrero",
      Mar: "Marzo",
      Abr: "Abril",
      May: "Mayo",
      Jun: "Junio",
      Jul: "Julio",
      Ago: "Agosto",
      Sep: "Septiembre",
      Oct: "Octubre",
      Nov: "Noviembre",
      Dic: "Diciembre",
    };
    return `${monthMap[month] || month} ${year}`;
  };

  const handleDataPointClick = (item: any, index: number) => {
    setLocalActiveIndex(index);
    onPress?.("chart1", index, processedData[index]);
  };

  const chartData = processedData.map((d, index) => {
    const value =
      priceType === "total"
        ? d.total
        : priceType === "terrain"
        ? d.terrain
        : d.construction;
    const isActive =
      (activePoint?.chart === "chart1" && activePoint?.index === index) ||
      localActiveIndex === index;
    const [month, year] = d.month.split(" ");

    return {
      value: value,
      label: `${month}\n${year}`,
      labelTextStyle: {
        color: COLORS.textSecondary,
        fontSize: 8,
        textAlign: "center" as const,
      },
      dataPointRadius: isActive ? 8 : 6,
      dataPointColor: isActive ? COLORS.white : COLORS.primary,
      dataPointLabelComponent: isActive
        ? () => (
            <View style={styles.activePointMarker}>
              <View style={styles.activePoint} />
            </View>
          )
        : undefined,
      onPress: () => handleDataPointClick(d, index),
      focusedDataPointRadius: 8,
      focusedDataPointColor: COLORS.white,
    };
  });

  const chartWidth = Math.max(
    Dimensions.get("window").width - 64,
    processedData.length * 60
  );
  const currentIndex =
    activePoint?.chart === "chart1" ? activePoint.index : localActiveIndex;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Precio por m² en el tiempo</Text>

      <View style={styles.filterRow}>
        {(["total", "terrain", "construction"] as const).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setPriceType(type)}
            style={[
              styles.filterButton,
              priceType === type && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                priceType === type && styles.filterTextActive,
              ]}
            >
              {type === "total"
                ? "Total"
                : type === "terrain"
                ? "Terreno"
                : "Const."}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ maxHeight: 300 }}
      >
        <View style={{ height: 280, justifyContent: "center" }}>
          {loading ? (
            <View
              style={{
                width: Dimensions.get("window").width - 64,
                alignItems: "center",
              }}
            >
              <Text style={{ color: COLORS.textSecondary }}>
                Cargando datos...
              </Text>
            </View>
          ) : processedData.length > 0 ? (
            <LineChart
              data={chartData}
              height={240}
              width={chartWidth}
              spacing={50}
              initialSpacing={20}
              color={COLORS.primary}
              thickness={3}
              dataPointsColor={COLORS.primary}
              dataPointsRadius={6}
              startFillColor={COLORS.primaryTransparent}
              endFillColor="transparent"
              startOpacity={0.9}
              endOpacity={0.1}
              areaChart
              curved
              isAnimated={false}
              animateOnDataChange={false}
              animationDuration={0}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={COLORS.cardBorder}
              yAxisColor={COLORS.cardBorder}
              yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 8 }}
              noOfSections={4}
              rulesColor={COLORS.background}
              rulesType="solid"
              formatYLabel={(value) => formatPrice(parseFloat(value))}
              hideDataPoints={false}
              focusEnabled={true}
              showDataPointOnFocus={true}
              onFocus={(item: any, index: number) =>
                handleDataPointClick(item, index)
              }
              delayBeforeUnFocus={3000}
              unFocusOnPressOut={false}
            />
          ) : (
            <View
              style={{
                width: Dimensions.get("window").width - 64,
                alignItems: "center",
              }}
            >
              <Text style={{ color: COLORS.textSecondary }}>
                No hay datos disponibles
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {!loading &&
        currentIndex !== null &&
        currentIndex !== undefined &&
        processedData[currentIndex] && (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipValue}>
              {formatPrice(
                priceType === "total"
                  ? processedData[currentIndex].total
                  : priceType === "terrain"
                  ? processedData[currentIndex].terrain
                  : processedData[currentIndex].construction
              )}
            </Text>
            <Text style={styles.tooltipLabel}>
              {formatMonth(processedData[currentIndex].month)}
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
    marginBottom: 12,
  },
  chartSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: "600",
  },
  activePointMarker: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -8,
  },
  activePoint: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 4,
    borderColor: COLORS.primary,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  tooltip: {
    position: "absolute",
    top: 90,
    right: 60,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  tooltipValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 2,
  },
  tooltipLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});

export default Chart01_PricePerM2;
