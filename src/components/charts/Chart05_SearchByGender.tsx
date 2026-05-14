import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { BaseChartProps } from "./types";
import { COLORS } from "../../constants/colors";

interface Chart05Props extends BaseChartProps {
  searches: any[];
  operationType: string;
  propertyType: string;
}

const Chart05_SearchByGender: React.FC<Chart05Props> = ({
  onPress,
  activePoint,
  searches,
  operationType,
  propertyType,
}) => {
  const chartData = React.useMemo(() => {
    if (!searches || searches.length === 0) {
      return [
        { genero: "Masculino", searches: 0 },
        { genero: "Femenino", searches: 0 },
      ];
    }

    let male = 0;
    let female = 0;

    searches.forEach((s: any) => {
      // 1. Get criteria for filtering
      let criteria: any = {};
      if (s.criterios_busqueda) {
        if (typeof s.criterios_busqueda === "string") {
          try {
            criteria = JSON.parse(s.criterios_busqueda);
          } catch (e) {}
        } else {
          criteria = s.criterios_busqueda;
        }
      }

      // 2. Filter by Operation Type (if applicable)
      const op = criteria.operacion || s.tipo_operacion || "";
      if (
        operationType &&
        op &&
        op.toLowerCase() !== operationType.toLowerCase()
      ) {
        return;
      }

      // 3. Extract Gender (Looking for 'genero', 'gender', or within criteria)
      // The user mentioned the field exists in the table.
      const genderRaw = s.genero || s.genero || criteria.genero || "";
      const genero = String(genderRaw);

      if (genero === "Masculino" || genero === "Masculino" || genero === "m") {
        male++;
      } else if (
        genero === "Femenino" ||
        genero === "Femenino" ||
        genero === "f"
      ) {
        female++;
      }
    });

    return [
      { genero: "Masculino", searches: male },
      { genero: "Femenino", searches: female },
    ];
  }, [searches, operationType, propertyType]);

  const maxSearches = Math.max(...chartData.map((d) => d.searches), 1);
  const totalSearches = chartData.reduce((sum, d) => sum + d.searches, 0);

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Búsquedas por Género</Text>
      <Text style={styles.chartSubtitle}>
        Filtros: Tipo: {propertyType} | Operación: {operationType}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.chartContainer, { width: 350 }]}>
          {chartData.map((d, index) => {
            const percentage =
              totalSearches > 0
                ? ((d.searches / totalSearches) * 100).toFixed(1)
                : "0.0";
            const isActive =
              activePoint?.chart === "chart5" && activePoint?.index === index;

            return (
              <TouchableOpacity
                key={index}
                style={[styles.barWrapper, { flex: 1 }]}
                onPress={() => onPress?.("chart5", index, d)}
                activeOpacity={0.7}
              >
                <Text style={styles.barValue}>{d.searches}</Text>
                <Text style={styles.percentageText}>{percentage}%</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${(d.searches / maxSearches) * 100}%`,
                        backgroundColor: isActive
                          ? index === 0
                            ? COLORS.infoDark
                            : COLORS.tagPink
                          : index === 0
                          ? COLORS.info
                          : COLORS.tagPinkLight,
                        width: 80,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.xAxisLabel}>{d.genero}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      {activePoint?.chart === "chart5" && chartData[activePoint.index] && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>Búsquedas</Text>
          <Text style={styles.tooltipValue}>
            {chartData[activePoint.index].searches}
          </Text>
          <Text style={styles.tooltipLabel}>
            {chartData[activePoint.index].genero}
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
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 220,
  },
  barWrapper: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    gap: 6,
  },
  barTrack: {
    width: "100%",
    height: "70%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "100%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  barValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  percentageText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  xAxisLabel: {
    fontSize: 13,
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
    borderColor: COLORS.info,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 120,
  },
  tooltipTitle: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  tooltipValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.info,
    marginBottom: 2,
  },
  tooltipLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
});

export default Chart05_SearchByGender;
