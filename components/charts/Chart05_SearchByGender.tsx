import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BaseChartProps, SearchByGenderData } from './types';
import { COLORS } from '../../constants/colors';

const searchByGender: SearchByGenderData[] = [
    { gender: 'Hombre', searches: 342 },
    { gender: 'Mujer', searches: 418 },
];

interface Chart05Props extends BaseChartProps { }

const Chart05_SearchByGender: React.FC<Chart05Props> = ({ onPress, activePoint }) => {
    const maxSearches = Math.max(...searchByGender.map(d => d.searches));
    const totalSearches = searchByGender.reduce((sum, d) => sum + d.searches, 0);

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Búsquedas por Género</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.chartContainer, { width: 350 }]}>
                    {searchByGender.map((d, index) => {
                        const percentage = ((d.searches / totalSearches) * 100).toFixed(1);
                        const isActive = activePoint?.chart === 'chart5' && activePoint?.index === index;

                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.barWrapper, { flex: 1 }]}
                                onPress={() => onPress?.('chart5', index, d)}
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
                                                    ? (index === 0 ? COLORS.infoDark : COLORS.tagPink)
                                                    : (index === 0 ? COLORS.info : COLORS.tagPinkLight),
                                                width: 80
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.xAxisLabel}>{d.gender}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
            {activePoint?.chart === 'chart5' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>Búsquedas</Text>
                    <Text style={styles.tooltipValue}>{searchByGender[activePoint.index].searches}</Text>
                    <Text style={styles.tooltipLabel}>{searchByGender[activePoint.index].gender}</Text>
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
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 220,
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
        gap: 6,
    },
    barTrack: {
        width: '100%',
        height: '70%',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    barFill: {
        width: '100%',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    barValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    percentageText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    xAxisLabel: {
        fontSize: 13,
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
        minWidth: 120,
    },
    tooltipTitle: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    tooltipValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.info,
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 11,
        color: COLORS.textTertiary,
    },
});

export default Chart05_SearchByGender;
