import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { FilteredChartProps } from "./types";
import { COLORS } from "../../constants/colors";
import currencyConverter from "../../utils/currencyConverter";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface DemandByColonia {
  estado: string;
  colonia: string;
  searches: number;
  properties: number;
  avgSearchPrice: number;
  minSearchPrice: number;
  maxSearchPrice: number;
  avgPropertyPrice: number;
}

const PRICE_FILTERS = [
  { id: "avg", label: "P. Búsqueda Promedio" },
  { id: "min", label: "P. Búsqueda Mínimo" },
  { id: "max", label: "P. Búsqueda Máximo" },
  { id: "prop", label: "P. Propiedades" },
];

const Chart04_DemandByZone: React.FC<FilteredChartProps> = ({
  onPress,
  activePoint,
  properties,
  searches,
  operationType,
  propertyType,
}) => {
  const [exchangeRate, setExchangeRate] = useState<number>(18);
  const [priceLineType, setPriceLineType] = useState<string>("avg");

  useEffect(() => {
    const fetchRate = async () => {
      const rate = await currencyConverter();
      setExchangeRate(rate);
    };

    fetchRate();
  }, []);

  const demandByColonia: DemandByColonia[] = useMemo(() => {
    if (!searches) return [];

    const map = new Map<
      string,
      {
        estado: string;
        colonia: string;
        searches: number;
        properties: number;
        sPriceSum: number;
        sPriceCount: number;
        sMinSum: number;
        sMinCount: number;
        sMaxSum: number;
        sMaxCount: number;
        pPriceSum: number;
        pPriceCount: number;
      }
    >();

    searches.forEach((item: any) => {
      // Filter by Property Type (Global)
      const pType = item.tipo_propiedad || item.subtipo || "";
      if (
        propertyType &&
        propertyType !== "Todos" &&
        !pType.toLowerCase().includes(propertyType.toLowerCase()) &&
        !propertyType.toLowerCase().includes(pType.toLowerCase())
      ) {
        return;
      }

      // Filter by Operation (Global)
      const op = item.tipo_operacion || item.operacion || "";
      if (op && op.toLowerCase() !== operationType.toLowerCase()) {
        return;
      }

      let estado = (item.estado || "").trim();
      let colonia = (
        item.colonia ||
        item.municipio ||
        item.ciudad ||
        ""
      ).trim();

      if (!colonia) return;

      const key = `${estado}||${colonia}`;
      let entry = map.get(key);

      if (!entry) {
        entry = {
          estado,
          colonia,
          searches: 0,
          properties: 0,
          sPriceSum: 0,
          sPriceCount: 0,
          sMinSum: 0,
          sMinCount: 0,
          sMaxSum: 0,
          sMaxCount: 0,
          pPriceSum: 0,
          pPriceCount: 0,
        };
      }

      entry.searches += 1;

      const currency = item.moneda || "MXN";
      const rate = currency === "USD" ? exchangeRate : 1;

      const minP = parseFloat(item.precio_min);
      const maxP = parseFloat(item.precio_max);

      if (!isNaN(minP) && minP > 0) {
        const val = minP * rate;
        entry.sMinSum += val;
        entry.sMinCount += 1;
      }
      if (!isNaN(maxP) && maxP > 0) {
        const val = maxP * rate;
        entry.sMaxSum += val;
        entry.sMaxCount += 1;
      }

      let avg = 0;
      if (!isNaN(minP) && !isNaN(maxP)) avg = (minP + maxP) / 2;
      else if (!isNaN(minP)) avg = minP;
      else if (!isNaN(maxP)) avg = maxP;

      if (avg > 0) {
        entry.sPriceSum += avg * rate;
        entry.sPriceCount += 1;
      }

      map.set(key, entry);
    });

    if (properties) {
      properties.forEach((item: any) => {
        if (item.status && item.status !== "Publicada") return;

        let estado = (item.estado || "").trim();
        let colonia = (item.colonia || "").trim();
        if (!colonia) return;

        const ops = Array.isArray(item.operaciones_propiedad)
          ? item.operaciones_propiedad
          : [item.operaciones_propiedad];

        const matchOp = ops.find(
          (o: any) =>
            o?.tipo_operacion?.toLowerCase() === operationType.toLowerCase()
        );

        if (!matchOp) return;

        const key = `${estado}||${colonia}`;
        const entry = map.get(key);
        if (!entry) return;

        entry.properties += 1;
        const pRate = matchOp.moneda === "USD" ? exchangeRate : 1;
        const pPrice = parseFloat(matchOp.precio) * pRate;

        if (!isNaN(pPrice) && pPrice > 0) {
          entry.pPriceSum += pPrice;
          entry.pPriceCount += 1;
        }
        map.set(key, entry);
      });
    }

    return Array.from(map.values())
      .filter((e) => e.searches > 0)
      .map((e) => ({
        estado: e.estado,
        colonia: e.colonia,
        searches: e.searches,
        properties: e.properties,
        avgSearchPrice: e.sPriceCount > 0 ? e.sPriceSum / e.sPriceCount : 0,
        minSearchPrice: e.sMinCount > 0 ? e.sMinSum / e.sMinCount : 0,
        maxSearchPrice: e.sMaxCount > 0 ? e.sMaxSum / e.sMaxCount : 0,
        avgPropertyPrice: e.pPriceCount > 0 ? e.pPriceSum / e.pPriceCount : 0,
      }))
      .sort((a, b) => b.searches - a.searches);
  }, [searches, properties, exchangeRate, operationType, propertyType]);

  const { barData, lineData, maxBarValue } = useMemo(() => {
    const bars: any[] = [];
    const lines: any[] = [];
    let maxValue = 0;

    demandByColonia.forEach((item, index) => {
      if (item.searches > maxValue) maxValue = item.searches;
      if (item.properties > maxValue) maxValue = item.properties;

      bars.push({
        value: item.searches,
        label: item.colonia,
        frontColor: COLORS.success,
        spacing: 12,
        labelWidth: 60,
        labelTextStyle: { color: COLORS.textTertiary, fontSize: 9 },
        topLabelComponent: () => (
          <Text style={styles.barLabel}>{item.searches}</Text>
        ),
        onPress: () => onPress?.("chart4", index, item),
      });

      bars.push({
        value: item.properties,
        frontColor: COLORS.error,
        spacing: 20,
        topLabelComponent: () =>
          item.properties > 0 ? (
            <Text style={[styles.barLabel, { color: COLORS.error }]}>
              {item.properties}
            </Text>
          ) : null,
        onPress: () => onPress?.("chart4", index, item),
      });

      let priceVal = 0;
      if (priceLineType === "min") priceVal = item.minSearchPrice;
      else if (priceLineType === "max") priceVal = item.maxSearchPrice;
      else if (priceLineType === "prop") priceVal = item.avgPropertyPrice;
      else priceVal = item.avgSearchPrice;

      // Scaling price for the chart (assuming Y-axis 2 is not fully independent here)
      // Dividing by 20,000 for Sale or 1,000 for Rent? Let's use a simpler heuristic
      const factor = operationType.toLowerCase() === "renta" ? 1000 : 50000;
      lines.push({
        value: priceVal > 0 ? priceVal / factor : 0,
        dataPointText: "",
        hideDataPoint: true,
      });
    });

    return {
      barData: bars,
      lineData: lines,
      maxBarValue: maxValue > 0 ? maxValue * 1.3 : 10,
    };
  }, [demandByColonia, priceLineType, operationType, onPress]);

  if (!barData || barData.length === 0) {
    return (
      <View
        style={[styles.chartCard, { height: 250, justifyContent: "center" }]}
      >
        <Text style={{ textAlign: "center", color: COLORS.textSecondary }}>
          No hay datos disponibles para la zona.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Demanda vs Oferta por Colonia</Text>

      {/* Price Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
      >
        <View style={styles.filterContainer}>
          {PRICE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterBtn,
                priceLineType === f.id && styles.filterBtnActive,
              ]}
              onPress={() => setPriceLineType(f.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  priceLineType === f.id && styles.filterTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendBox, { backgroundColor: COLORS.success }]}
          />
          <Text style={styles.legendText}>Búsquedas</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: COLORS.error }]} />
          <Text style={styles.legendText}>Prop. Publicadas</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendLine} />
          <Text style={styles.legendText}>Precio (Escale)</Text>
        </View>
      </View>

      <View style={{ height: 260 }}>
        <BarChart
          data={barData}
          barWidth={35}
          spacing={40}
          roundedTop
          height={200}
          width={SCREEN_WIDTH}
          xAxisThickness={1}
          yAxisThickness={0}
          yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
          noOfSections={4}
          showLine
          lineData={lineData}
          lineConfig={{
            color: COLORS.primary,
            thickness: 2,
            curved: false,
            hideDataPoints: false,
            dataPointsColor: COLORS.primary,
          }}
          maxValue={maxBarValue}
          isAnimated={false}
        />
      </View>

      {activePoint?.chart === "chart4" && activePoint.value && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>{activePoint.value.colonia}</Text>
          <Text style={[styles.tooltipValue, { color: COLORS.success }]}>
            Búsquedas: {activePoint.value.searches}
          </Text>
          <Text style={[styles.tooltipValue, { color: COLORS.error }]}>
            Propiedades: {activePoint.value.properties}
          </Text>
          <View style={styles.tooltipDivider} />
          <Text style={styles.tooltipLabel}>
            P. Búsqueda Min: $
            {Math.round(activePoint.value.minSearchPrice).toLocaleString()}
          </Text>
          <Text style={styles.tooltipLabel}>
            P. Búsqueda Max: $
            {Math.round(activePoint.value.maxSearchPrice).toLocaleString()}
          </Text>
          <Text style={styles.tooltipLabel}>
            P. Búsqueda Prom: $
            {Math.round(activePoint.value.avgSearchPrice).toLocaleString()}
          </Text>
          <Text style={styles.tooltipLabel}>
            P. Propiedades: $
            {Math.round(activePoint.value.avgPropertyPrice).toLocaleString()}
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
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
    fontWeight: "600",
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLine: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.primary,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  barLabel: {
    color: COLORS.success,
    fontSize: 10,
    marginBottom: 4,
    fontWeight: "bold",
    textAlign: "center",
  },
  tooltip: {
    marginTop: 16,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  tooltipLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 8,
  },
});

export default Chart04_DemandByZone;
