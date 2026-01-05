import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BaseChartProps, PublishedVsSoldData } from './types';
import { COLORS } from '../../constants/colors';

const publishedVsSold: PublishedVsSoldData[] = [
    { zone: 'Centro', published: 178, sold: 124 },
    { zone: 'Norte', published: 156, sold: 98 },
    { zone: 'Sur', published: 198, sold: 145 },
    { zone: 'Este', published: 123, sold: 76 },
    { zone: 'Oeste', published: 167, sold: 112 },
];

interface Chart09Props extends BaseChartProps { }

const Chart09_PublishedVsSold: React.FC<Chart09Props> = ({ onPress, activePoint }) => {
    const maxValue = Math.max(...publishedVsSold.map(d => Math.max(d.published, d.sold)));

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Publicadas vs Vendidas</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>

            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: COLORS.info }]} />
                    <Text style={styles.legendText}>Publicadas</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendBox, { backgroundColor: COLORS.success }]} />
                    <Text style={styles.legendText}>Vendidas</Text>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.chartContainer, { width: 600, gap: 24 }]}>
                    {publishedVsSold.map((d, index) => {
                        const isActive = activePoint?.chart === 'chart9' && activePoint?.index === index;

                        return (
                            <TouchableOpacity
                                key={index}
                                style={styles.barWrapper}
                                onPress={() => onPress?.('chart9', index, d)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.groupBarTrack}>
                                    <View style={styles.barColumn}>
                                        <Text style={styles.barValueSmall}>{d.published}</Text>
                                        <View
                                            style={[
                                                styles.barFill,
                                                {
                                                    height: `${(d.published / maxValue) * 100}%`,
                                                    backgroundColor: isActive ? COLORS.infoDark : COLORS.info,
                                                    width: 28
                                                }
                                            ]}
                                        />
                                    </View>
                                    <View style={styles.barColumn}>
                                        <Text style={styles.barValueSmall}>{d.sold}</Text>
                                        <View
                                            style={[
                                                styles.barFill,
                                                {
                                                    height: `${(d.sold / maxValue) * 100}%`,
                                                    backgroundColor: isActive ? COLORS.successDark : COLORS.success,
                                                    width: 28
                                                }
                                            ]}
                                        />
                                    </View>
                                </View>
                                <Text style={styles.xAxisLabel}>{d.zone}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {activePoint?.chart === 'chart9' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>{publishedVsSold[activePoint.index].zone}</Text>
                    <Text style={styles.tooltipValue}>Publicadas: {publishedVsSold[activePoint.index].published}</Text>
                    <Text style={styles.tooltipLabel}>Vendidas: {publishedVsSold[activePoint.index].sold}</Text>
                    <Text style={styles.tooltipPercentage}>
                        Efectividad: {((publishedVsSold[activePoint.index].sold / publishedVsSold[activePoint.index].published) * 100).toFixed(1)}%
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
        height: 220,
    },
    barWrapper: {
        alignItems: 'center',
        width: 100,
        height: '100%',
        justifyContent: 'flex-end',
        gap: 8,
    },
    groupBarTrack: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: '85%',
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
    barValueSmall: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginBottom: 4,
        textAlign: 'center',
        fontWeight: '700',
    },
    xAxisLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    tooltip: {
        position: 'absolute',
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
        minWidth: 140,
    },
    tooltipTitle: {
        fontSize: 12,
        color: COLORS.textPrimary,
        fontWeight: '600',
        marginBottom: 6,
    },
    tooltipValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.info,
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 14,
        color: COLORS.success,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    tooltipPercentage: {
        fontSize: 11,
        color: COLORS.textTertiary,
        fontStyle: 'italic',
    },
});

export default Chart09_PublishedVsSold;
