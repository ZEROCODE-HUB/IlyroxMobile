import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BaseChartProps, SurfaceVsSaleTimeData } from './types';
import { COLORS } from '../../constants/colors';

const surfaceVsSaleTime: SurfaceVsSaleTimeData[] = [
    { neighborhood: 'Centro', fast: 65, slow: 0 },
    { neighborhood: 'Centro, Aguascalientes', fast: 88, slow: 0 },
    { neighborhood: 'Maravillas, Aguascalientes', fast: 120, slow: 140 },
    { neighborhood: 'Miravalle, Aguascalientes', fast: 95, slow: 145 },
];

interface Chart12Props extends BaseChartProps { }

const Chart12_SurfaceVsSaleTime: React.FC<Chart12Props> = ({ onPress, activePoint }) => {
    const maxValue = Math.max(...surfaceVsSaleTime.map(d => Math.max(d.fast, d.slow)));

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Superficie m² de Inmuebles Vendidos</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>

            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: COLORS.success }]} />
                    <Text style={styles.legendText}>Vendido &lt; 6 meses</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: COLORS.error }]} />
                    <Text style={styles.legendText}>Vendido &gt;= 6 meses</Text>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 250 }}>
                <View style={[styles.chartContainer, { width: 600, gap: 24 }]}>
                    {surfaceVsSaleTime.map((d, index) => {
                        const isActive = activePoint?.chart === 'chart12' && activePoint?.index === index;

                        return (
                            <TouchableOpacity
                                key={index}
                                style={styles.barWrapper}
                                onPress={() => onPress?.('chart12', index, d)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.groupBarTrack}>
                                    {d.fast > 0 && (
                                        <View style={styles.barColumn}>
                                            <View style={styles.labelBadge}>
                                                <Text style={styles.labelBadgeText}>{d.fast} m²</Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.barFill,
                                                    {
                                                        height: `${(d.fast / maxValue) * 100}%`,
                                                        backgroundColor: isActive ? COLORS.successDark : COLORS.success,
                                                        width: 28
                                                    }
                                                ]}
                                            />
                                        </View>
                                    )}
                                    {d.slow > 0 && (
                                        <View style={styles.barColumn}>
                                            <View style={[styles.labelBadge, { backgroundColor: COLORS.error }]}>
                                                <Text style={styles.labelBadgeText}>{d.slow} m²</Text>
                                            </View>
                                            <View
                                                style={[
                                                    styles.barFill,
                                                    {
                                                        height: `${(d.slow / maxValue) * 100}%`,
                                                        backgroundColor: isActive ? COLORS.errorDark : COLORS.error,
                                                        width: 28
                                                    }
                                                ]}
                                            />
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.xAxisLabel, { fontSize: 9, width: 100 }]} numberOfLines={2}>
                                    {d.neighborhood}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {activePoint?.chart === 'chart12' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>{surfaceVsSaleTime[activePoint.index].neighborhood}</Text>
                    <Text style={styles.tooltipValue}>Rápido: {surfaceVsSaleTime[activePoint.index].fast} m²</Text>
                    <Text style={styles.tooltipLabel}>Lento: {surfaceVsSaleTime[activePoint.index].slow} m²</Text>
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
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        height: 200,
    },
    barWrapper: {
        alignItems: 'center',
        width: 120,
        height: '100%',
        justifyContent: 'flex-end',
        gap: 8,
    },
    groupBarTrack: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: '80%',
        justifyContent: 'center',
        gap: 8,
    },
    barColumn: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
    },
    barFill: {
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    labelBadge: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        marginBottom: 4,
    },
    labelBadgeText: {
        color: COLORS.white,
        fontSize: 9,
        fontWeight: 'bold',
    },
    xAxisLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        textAlign: 'center',
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
        color: COLORS.textPrimary,
        fontWeight: '600',
        marginBottom: 6,
    },
    tooltipValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.success,
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 11,
        color: COLORS.error,
        fontWeight: '600',
    },
});

export default Chart12_SurfaceVsSaleTime;
