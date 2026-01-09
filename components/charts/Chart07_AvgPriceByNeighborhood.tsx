import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BaseChartProps, AvgPriceByNeighborhoodData } from './types';
import { COLORS } from '../../constants/colors';

const avgPriceByNeighborhood: AvgPriceByNeighborhoodData[] = [
    { neighborhood: 'Lomas de Chapultepec', avgPrice: 9500 },
    { neighborhood: 'Polanco', avgPrice: 8200 },
    { neighborhood: 'Santa Fe', avgPrice: 7800 },
    { neighborhood: 'Roma Norte', avgPrice: 6500 },
    { neighborhood: 'Condesa', avgPrice: 6200 },
    { neighborhood: 'Del Valle', avgPrice: 5400 },
    { neighborhood: 'Narvarte', avgPrice: 4800 },
];

interface Chart07Props extends BaseChartProps { }

const Chart07_AvgPriceByNeighborhood: React.FC<Chart07Props> = ({ onPress, activePoint }) => {
    const maxPrice = Math.max(...avgPriceByNeighborhood.map(d => d.avgPrice));

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Precio Promedio por Colonia</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>
            <View style={styles.verticalList}>
                {avgPriceByNeighborhood.map((d, index) => {
                    const isActive = activePoint?.chart === 'chart7' && activePoint?.index === index;

                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => onPress?.('chart7', index, d)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowHeader}>
                                <Text style={styles.rowLabel}>#{index + 1} {d.neighborhood}</Text>
                                <Text style={[styles.rowValueText, isActive && { color: COLORS.successDark }]}>${d.avgPrice.toLocaleString()}</Text>
                            </View>
                            <View style={styles.rowTrack}>
                                <View
                                    style={[
                                        styles.rowFill,
                                        {
                                            width: `${(d.avgPrice / maxPrice) * 100}%`,
                                            backgroundColor: isActive ? COLORS.successDark : COLORS.success
                                        }
                                    ]}
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {activePoint?.chart === 'chart7' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>Precio Promedio</Text>
                    <Text style={styles.tooltipValue}>${avgPriceByNeighborhood[activePoint.index].avgPrice.toLocaleString()}</Text>
                    <Text style={styles.tooltipLabel}>{avgPriceByNeighborhood[activePoint.index].neighborhood}</Text>
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
        marginBottom: 16,
    },
    verticalList: {
        gap: 14,
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    rowLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
        flex: 1,
    },
    rowValueText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.success,
    },
    rowTrack: {
        width: '100%',
        height: 10,
        backgroundColor: COLORS.backgroundDark,
        borderRadius: 5,
        overflow: 'hidden',
    },
    rowFill: {
        height: '100%',
        borderRadius: 5,
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
        fontSize: 10,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    tooltipValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.success,
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 10,
        color: COLORS.textTertiary,
    },
});

export default Chart07_AvgPriceByNeighborhood;
