import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { BaseChartProps, SearchVsPropertyData } from './types';
import { COLORS } from '../../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

const searchVsProperties: SearchVsPropertyData[] = [
    { range: '0-200k', searches: 145, properties: 78, minConstruction: 80, minLand: 100 },
    { range: '200-400k', searches: 198, properties: 132, minConstruction: 120, minLand: 150 },
    { range: '400-600k', searches: 156, properties: 145, minConstruction: 150, minLand: 200 },
    { range: '600-800k', searches: 98, properties: 89, minConstruction: 180, minLand: 250 },
    { range: '800k-1M', searches: 76, properties: 56, minConstruction: 200, minLand: 280 },
    { range: '1M+', searches: 45, properties: 34, minConstruction: 250, minLand: 350 },
];

interface Chart03Props extends BaseChartProps { }

const Chart03_SearchVsProperties: React.FC<Chart03Props> = ({ onPress, activePoint }) => {
    const chartData: any[] = [];
    searchVsProperties.forEach((d, index) => {
        chartData.push({
            value: d.searches,
            label: d.range.split('-')[0],
            spacing: 2,
            labelWidth: 30,
            labelTextStyle: { color: COLORS.textTertiary, fontSize: 9 },
            frontColor: COLORS.warning,
            onPress: () => onPress?.('chart3', index, { range: d.range, value: d.searches, type: 'Búsquedas', properties: d.properties })
        });
        chartData.push({
            value: d.properties,
            frontColor: COLORS.error,
            onPress: () => onPress?.('chart3', index, { range: d.range, value: d.properties, type: 'Propiedades', searches: d.searches })
        });
    });

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Demanda vs Oferta</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>

            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: COLORS.warning }]} />
                    <Text style={styles.legendText}>Búsquedas</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: COLORS.error }]} />
                    <Text style={styles.legendText}>Propiedades</Text>
                </View>
            </View>

            <View style={{ height: 250, overflow: 'hidden' }}>
                <BarChart
                    data={chartData}
                    barWidth={18}
                    spacing={20}
                    roundedTop
                    roundedBottom
                    height={200}
                    width={SCREEN_WIDTH - 60}
                    xAxisThickness={1}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
                    noOfSections={4}
                    xAxisColor={COLORS.cardBorder}
                    isAnimated
                    maxValue={220}
                />
            </View>

            {activePoint?.chart === 'chart3' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>Rango {searchVsProperties[activePoint.index].range}</Text>
                    <Text style={styles.tooltipValue}>Búsquedas: {searchVsProperties[activePoint.index].searches}</Text>
                    <Text style={styles.tooltipLabel}>Propiedades: {searchVsProperties[activePoint.index].properties}</Text>
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
    legendRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendBox: {
        width: 14,
        height: 14,
        borderRadius: 3,
    },
    legendText: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    tooltip: {
        position: 'absolute',
        top: 60,
        right: 20,
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS.warning,
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
        color: COLORS.warning,
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 11,
        color: COLORS.error,
        fontWeight: '600',
    },
});

export default Chart03_SearchVsProperties;
