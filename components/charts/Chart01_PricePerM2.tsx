import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { BaseChartProps, PricePerM2Data } from "./types";
import { COLORS } from "../../constants/colors";

const SCREEN_WIDTH = Dimensions.get("window").width;

const pricePerM2Data: PricePerM2Data[] = [
  { month: "Ene 2024", total: 3900, terrain: 3500, construction: 4200 },
  { month: "Feb 2024", total: 4200, terrain: 3800, construction: 4500 },
  { month: "Abr 2024", total: 4800, terrain: 4300, construction: 5100 },
  { month: "Jul 2024", total: 5800, terrain: 5200, construction: 6200 },
  { month: "Sep 2024", total: 6500, terrain: 5800, construction: 6900 },
  { month: "Ene 2025", total: 7600, terrain: 6800, construction: 8100 },
  { month: "Feb 2025", total: 7600, terrain: 6800, construction: 8100 },
  { month: "May 2025", total: 7600, terrain: 6800, construction: 8100 },
  { month: "Jun 2025", total: 8167, terrain: 7300, construction: 8700 },
  { month: "Jul 2025", total: 9500, terrain: 8500, construction: 10100 },
  { month: "Sep 2025", total: 11300, terrain: 10100, construction: 12000 },
  { month: "Oct 2025", total: 9800, terrain: 8800, construction: 10400 },
];

interface Chart01Props extends BaseChartProps {}

const Chart01_PricePerM2: React.FC<Chart01Props> = ({
  onPress,
  activePoint,
}) => {
  const [priceType, setPriceType] = useState<
    "total" | "terrain" | "construction"
  >("total");
  const [localActiveIndex, setLocalActiveIndex] = useState<number | null>(null);

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}K`;
    }
    return `$${price}`;
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
    onPress?.("chart1", index, pricePerM2Data[index]);
  };

  const chartData = pricePerM2Data.map((d, index) => {
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

  const chartWidth = pricePerM2Data.length * 60;
  const currentIndex =
    activePoint?.chart === "chart1" ? activePoint.index : localActiveIndex;

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Precio por m² en el tiempo</Text>
      <Text style={styles.chartSubtitle}>
        Filtros: Tipo: Habitacional | Operación: venta
      </Text>

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
        <View style={{ height: 280 }}>
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
            isAnimated
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
        </View>
      </ScrollView>

      {currentIndex !== null && currentIndex !== undefined && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipValue}>
            {formatPrice(
              priceType === "total"
                ? pricePerM2Data[currentIndex].total
                : priceType === "terrain"
                ? pricePerM2Data[currentIndex].terrain
                : pricePerM2Data[currentIndex].construction
            )}
          </Text>
          <Text style={styles.tooltipLabel}>
            {formatMonth(pricePerM2Data[currentIndex].month)}
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
