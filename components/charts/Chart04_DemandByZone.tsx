import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { BaseChartProps, DemandByZoneData } from './types';
import { COLORS } from '../../constants/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

const demandByZone: DemandByZoneData[] = [
    { zone: 'Sur', searches: 198, properties: 156, minPrice: 420 },
    { zone: 'Este', searches: 112, properties: 89, minPrice: 320 },
    { zone: 'Oeste', searches: 156, properties: 132, minPrice: 390 },
    { zone: 'Perif', searches: 89, properties: 67, minPrice: 280 },
];

interface Chart04Props extends BaseChartProps { }

const Chart04_DemandByZone: React.FC<Chart04Props> = ({ onPress, activePoint }) => {
    const barData = demandByZone.map((d, index) => ({
        value: d.searches,
        label: d.zone,
        frontColor: COLORS.success,
        topLabelComponent: () => (
            <Text style={{ color: COLORS.success, fontSize: 11, marginBottom: 4, fontWeight: 'bold' }}>{d.searches}</Text>
        ),
        onPress: () => onPress?.('chart4', index, { zone: d.zone, searches: d.searches, properties: d.properties, minPrice: d.minPrice })
    }));

    const lineConfig = {
        color: COLORS.textPrimary,
        thickness: 2,
        curved: true,
        hideDataPoints: false,
        dataPointsColor: COLORS.textPrimary,
        strokeDashArray: [4, 4],
    };

    const lineData = demandByZone.map((d) => ({
        value: d.minPrice / 2,
        dataPointText: '',
    }));

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Demanda por Zona</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>

            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: COLORS.success }]} />
                    <Text style={styles.legendText}>Búsquedas</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendLine]} />
                    <Text style={styles.legendText}>Precio Mín</Text>
                </View>
            </View>

            <View style={{ height: 250, overflow: 'hidden' }}>
                <BarChart
                    data={barData}
                    barWidth={40}
                    spacing={50}
                    roundedTop
                    roundedBottom
                    height={200}
                    width={SCREEN_WIDTH - 60}
                    xAxisThickness={1}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
                    noOfSections={4}
                    xAxisColor={COLORS.cardBorder}
                    showLine
                    lineData={lineData}
                    lineConfig={lineConfig}
                    maxValue={220}
                />
            </View>

            {activePoint?.chart === 'chart4' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>{demandByZone[activePoint.index].zone}</Text>
                    <Text style={styles.tooltipValue}>Búsquedas: {demandByZone[activePoint.index].searches}</Text>
                    <Text style={styles.tooltipLabel}>Propiedades: {demandByZone[activePoint.index].properties}</Text>
                    <Text style={styles.tooltipLabel}>Precio mín: ${demandByZone[activePoint.index].minPrice}k</Text>
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
    legendLine: {
        width: 20,
        height: 2,
        backgroundColor: COLORS.textPrimary,
        borderStyle: 'dashed',
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
        borderColor: COLORS.success,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 5,
        minWidth: 140,
    },
    tooltipTitle: {
        fontSize: 12,
        color: COLORS.textPrimary,
        fontWeight: '600',
        marginBottom: 6,
    },
    tooltipValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.success,
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 11,
        color: COLORS.textTertiary,
    },
});

export default Chart04_DemandByZone;
