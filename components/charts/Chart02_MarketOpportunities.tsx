import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { BaseChartProps, MarketOpportunityData } from './types';
import { COLORS } from '../../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

const marketOpportunities: MarketOpportunityData[] = [
    { range: '0-50', avgPrice: 2800, searches: 65, minConstruction: 30, minLand: 40 },
    { range: '50-100', avgPrice: 2650, searches: 156, minConstruction: 60, minLand: 80 },
    { range: '100-150', avgPrice: 2500, searches: 198, minConstruction: 90, minLand: 120 },
    { range: '150-200', avgPrice: 2350, searches: 145, minConstruction: 130, minLand: 170 },
    { range: '200-250', avgPrice: 2100, searches: 98, minConstruction: 180, minLand: 220 },
    { range: '250+', avgPrice: 1900, searches: 45, minConstruction: 230, minLand: 280 },
];

interface Chart02Props extends BaseChartProps { }

const Chart02_MarketOpportunities: React.FC<Chart02Props> = ({ onPress, activePoint }) => {
    const [dataType, setDataType] = useState<'searches' | 'avgPrice'>('searches');

    const chartData = marketOpportunities.map((d, index) => ({
        value: dataType === 'searches' ? d.searches : d.avgPrice,
        label: d.range,
        dataPointText: '',
        textShiftY: -10,
        textColor: COLORS.textPrimary,
        textFontSize: 10,
        onPress: () => onPress?.('chart2', index, d),
    }));

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Oportunidades de Mercado</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>

            <View style={styles.filterRow}>
                {(['searches', 'avgPrice'] as const).map((type) => (
                    <TouchableOpacity
                        key={type}
                        onPress={() => setDataType(type)}
                        style={[styles.filterButton, dataType === type && styles.filterButtonActive]}
                    >
                        <Text style={[styles.filterText, dataType === type && styles.filterTextActive]}>
                            {type === 'searches' ? 'Búsquedas' : 'Precio/m²'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ height: 280, overflow: 'hidden' }}>
                <LineChart
                    data={chartData}
                    height={220}
                    width={SCREEN_WIDTH - 60}
                    spacing={44}
                    initialSpacing={20}
                    color={dataType === 'searches' ? COLORS.tagPurple : COLORS.warning}
                    thickness={3}
                    dataPointsColor={dataType === 'searches' ? COLORS.tagPurple : COLORS.warning}
                    dataPointsRadius={5}
                    startFillColor={dataType === 'searches' ? COLORS.tagPurpleLight : COLORS.warningLight}
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
                    xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 9 }}
                    noOfSections={4}
                    rulesColor={COLORS.background}
                    rulesType="solid"
                />
            </View>

            {activePoint?.chart === 'chart2' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>Rango {marketOpportunities[activePoint.index].range} m²</Text>
                    <Text style={styles.tooltipValue}>
                        {dataType === 'searches'
                            ? `${marketOpportunities[activePoint.index].searches} búsquedas`
                            : `$${marketOpportunities[activePoint.index].avgPrice}/m²`
                        }
                    </Text>
                    <Text style={styles.tooltipLabel}>
                        {dataType === 'searches'
                            ? `Precio: $${marketOpportunities[activePoint.index].avgPrice}/m²`
                            : `Búsquedas: ${marketOpportunities[activePoint.index].searches}`
                        }
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
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    chartSubtitle: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginBottom: 12,
    },
    filterRow: {
        flexDirection: 'row',
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
        backgroundColor: COLORS.tagPurple,
    },
    filterText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    filterTextActive: {
        color: COLORS.white,
        fontWeight: '600',
    },
    tooltip: {
        position: 'absolute',
        top: 90,
        right: 20,
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS.tagPurple,
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
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.tagPurple,
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 11,
        color: COLORS.warning,
        fontWeight: '600',
    },
});

export default Chart02_MarketOpportunities;
