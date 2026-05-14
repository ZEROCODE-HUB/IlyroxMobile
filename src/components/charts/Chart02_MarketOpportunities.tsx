import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { FilteredChartProps } from "./types";
import { COLORS } from "../../constants/colors";
import currencyConverter from "../../utils/currencyConverter";

const Chart02_MarketOpportunities: React.FC<FilteredChartProps> = ({
  onPress,
  properties,
  searches,
  operationType,
}) => {
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [lineData, setLineData] = useState<any[]>([]);
  const [maxBarValue, setMaxBarValue] = useState(0);
  const [maxLineValue, setMaxLineValue] = useState(0);
  const [valueCoin, setValueCoin] = useState<number>(0);

  useEffect(() => {
    const fetchRate = async () => {
      const value = await currencyConverter();
      setValueCoin(value);
    };
    fetchRate();
  }, []);

  const EXCHANGE_RATE = valueCoin || 18;

  const ranges = [
    { label: "0-50", min: 0, max: 50 },
    { label: "50-100", min: 50, max: 100 },
    { label: "100-150", min: 100, max: 150 },
    { label: "150-200", min: 150, max: 200 },
    { label: "200-250", min: 200, max: 250 },
    { label: "250-300", min: 250, max: 300 },
    { label: "300+", min: 300, max: 99999 },
  ];

  useEffect(() => {
    const processData = () => {
      setLoading(true);
      if (!properties || !searches) {
        setLoading(false);
        return;
      }

      // Acumuladores por rango
      const acc = ranges.map((r) => ({
        ...r,
        totalPriceM2: 0,
        countProps: 0,
        searchesCount: 0,
      }));

      // 1. Procesar Propiedades (Barras: Precio Promedio x m2)
      properties.forEach((item: any) => {
        const ops = Array.isArray(item.operaciones_propiedad)
          ? item.operaciones_propiedad
          : [item.operaciones_propiedad];
        const op = ops.find(
          (o: any) =>
            o?.tipo_operacion?.toLowerCase() === operationType.toLowerCase(),
        );

        if (op) {
          let price = op.precio || 0;
          if (op.moneda === "USD") price *= EXCHANGE_RATE;

          // Preferencia: Construcción > Terreno
          const m2 =
            item.metros_cuadrados_construccion ||
            item.metros_cuadrados_terreno ||
            0;

          if (m2 > 0) {
            const pricePerM2 = price / m2;
            const rangeIndex = ranges.findIndex(
              (r) => m2 >= r.min && m2 < r.max,
            );

            if (rangeIndex !== -1) {
              acc[rangeIndex].totalPriceM2 += pricePerM2;
              acc[rangeIndex].countProps += 1;
            }
          }
        }
      });

      // 2. Procesar Búsquedas (Línea: Cantidad de búsquedas)
      searches.forEach((search: any) => {
        // Filter by operation logic if possible (assuming searches have operation/type info or we check criterios)
        let criteria: any = {};
        if (search.criterios_busqueda) {
          if (typeof search.criterios_busqueda === "string") {
            try {
              criteria = JSON.parse(search.criterios_busqueda);
            } catch (e) {}
          } else {
            criteria = search.criterios_busqueda;
          }
        }

        // If criteria has operation, check it. Or check top level.
        const searchOp =
          criteria.operacion ||
          criteria.tipo_operacion ||
          search.tipo_operacion;
        if (
          searchOp &&
          searchOp.toLowerCase() !== operationType.toLowerCase()
        ) {
          return;
        }

        let m2Target = 0;
        // Intentar parsear campos de búsqueda
        if (search.metros_construccion) {
          m2Target = parseFloat(search.metros_construccion);
        } else if (search.min_m2_construccion || search.max_m2_construccion) {
          const min = parseFloat(search.min_m2_construccion) || 0;
          const max = parseFloat(search.max_m2_construccion) || min;
          m2Target = (min + max) / 2;
        } else if (search.metros_terreno) {
          m2Target = parseFloat(search.metros_terreno);
        } else if (search.min_m2_terreno || search.max_m2_terreno) {
          const min = parseFloat(search.min_m2_terreno) || 0;
          const max = parseFloat(search.max_m2_terreno) || min;
          m2Target = (min + max) / 2;
        }

        if (m2Target > 0) {
          const rangeIndex = ranges.findIndex(
            (r) => m2Target >= r.min && m2Target < r.max,
          );
          if (rangeIndex !== -1) {
            acc[rangeIndex].searchesCount += 1;
          }
        }
      });

      // 3. Formatear datos para Gifted Charts
      const bars: any[] = [];
      const lines: any[] = [];
      let mP = 0;
      let mL = 0;

      acc.forEach((item) => {
        const avgPrice =
          item.countProps > 0 ? item.totalPriceM2 / item.countProps : 0;

        if (avgPrice > mP) mP = avgPrice;
        if (item.searchesCount > mL) mL = item.searchesCount;

        bars.push({
          value: avgPrice,
          label: item.label,
          frontColor: COLORS.primary,
          topLabelComponent: () =>
            avgPrice > 0 ? (
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 10,
                  marginBottom: 2,
                }}
              >
                {`$${(avgPrice / 1000).toFixed(0)}k`}
              </Text>
            ) : null,
        });

        lines.push({
          value: item.searchesCount,
          dataPointText:
            item.searchesCount > 0 ? item.searchesCount.toString() : "",
          dataPointTextColor: COLORS.error,
          hideDataPoint: item.searchesCount === 0,
          customDataPoint:
            item.searchesCount === 0 ? () => <View /> : undefined, // Ocultar punto si es 0
          isSecondary: true, // Asegurar que use el eje secundario
        });
      });

      setMaxBarValue(mP * 1.2);
      setMaxLineValue(mL > 0 ? mL * 1.2 : 10);
      setChartData(bars);
      setLineData(lines);
      setLoading(false);
    };

    processData();
  }, [properties, searches, operationType, EXCHANGE_RATE]);

  if (loading) {
    return (
      <View style={[styles.chartCard, styles.centered]}>
        <Text style={styles.loadingText}>Cargando datos del mercado...</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Oportunidades de Mercado</Text>
      <Text style={styles.chartSubtitle}>
        Barras: Precio Promedio/m² (Oferta) | Línea Roja: Búsquedas (Demanda)
      </Text>

      <View style={{ height: 320, overflow: "visible" }}>
        {chartData.length > 0 ? (
          <BarChart
            data={chartData}
            barWidth={32}
            spacing={35}
            initialSpacing={10}
            xAxisThickness={1}
            xAxisColor={COLORS.cardBorder}
            yAxisThickness={0}
            yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 15 }}
            noOfSections={5}
            maxValue={maxBarValue}
            isAnimated={false}
            animationDuration={0}
            roundedTop
            // Configuración de la línea (Búsquedas)
            showLine
            lineData={lineData}
            lineConfig={{
              color: COLORS.error,
              thickness: 3, // Más grueso
              curved: false,
              hideDataPoints: false,
              dataPointsColor: COLORS.error,
              dataPointsRadius: 4, // Puntos más grandes
              strokeDashArray: [0, 0], // Linea sólida
              isSecondary: true, // Forzar uso de eje secundario
            }}
            // Eje secundario para la línea (ya que son escalas diferentes: $ vs #)
            secondaryYAxis={{
              maxValue: maxLineValue,
              yAxisTextStyle: { color: COLORS.error, fontSize: 20 },
              showYAxisIndices: true,
              yAxisColor: COLORS.error,
            }}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No hay datos suficientes</Text>
          </View>
        )}
      </View>

      {/* Leyenda simple */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendColor, { backgroundColor: COLORS.primary }]}
          />
          <Text style={styles.legendText}>Precio $/m²</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendColor, { backgroundColor: COLORS.error }]}
          />
          <Text style={styles.legendText}>Búsquedas</Text>
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
  centered: {
    height: 300,
    justifyContent: "center",
    alignItems: "center",
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
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  noDataContainer: {
    height: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    color: COLORS.textSecondary,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    gap: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});

export default Chart02_MarketOpportunities;
