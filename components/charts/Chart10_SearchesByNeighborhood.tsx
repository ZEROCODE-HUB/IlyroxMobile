import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BaseChartProps, SearchesByNeighborhoodData } from './types';
import { COLORS } from '../../constants/colors';

const searchesByNeighborhood: SearchesByNeighborhoodData[] = [
    { neighborhood: 'Polanco', searches: 234 },
    { neighborhood: 'Roma', searches: 198 },
    { neighborhood: 'Condesa', searches: 178 },
    { neighborhood: 'Santa Fe', searches: 156 },
    { neighborhood: 'Del Valle', searches: 134 },
    { neighborhood: 'Narvarte', searches: 98 },
];

interface Chart10Props extends BaseChartProps { }

const Chart10_SearchesByNeighborhood: React.FC<Chart10Props> = ({ onPress, activePoint }) => {
    const maxSearches = Math.max(...searchesByNeighborhood.map(d => d.searches));

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Interés por Colonia</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={[styles.chartContainer, { width: 600, gap: 20 }]}>
                    {searchesByNeighborhood.map((d, index) => {
                        const isActive = activePoint?.chart === 'chart10' && activePoint?.index === index;

                        return (
                            <TouchableOpacity
                                key={index}
                                style={styles.barWrapper}
                                onPress={() => onPress?.('chart10', index, d)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.barValue}>{d.searches}</Text>
                                <View style={styles.barTrack}>
                                    <View
                                        style={[
                                            styles.barFill,
                                            {
                                                height: `${(d.searches / maxSearches) * 100}%`,
                                                backgroundColor: isActive ? COLORS.tagPurple : COLORS.tagPurpleLight
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.xAxisLabel, { fontSize: 10 }]} numberOfLines={2}>
                                    {d.neighborhood}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {activePoint?.chart === 'chart10' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>Búsquedas</Text>
                    <Text style={styles.tooltipValue}>{searchesByNeighborhood[activePoint.index].searches}</Text>
                    <Text style={styles.tooltipLabel}>{searchesByNeighborhood[activePoint.index].neighborhood}</Text>
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
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        height: 200,
    },
    barWrapper: {
        alignItems: 'center',
        width: 80,
        height: '100%',
        justifyContent: 'flex-end',
        gap: 6,
    },
    barTrack: {
        width: '70%',
        height: '75%',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    barFill: {
        width: '100%',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    barValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.tagPurple,
        marginBottom: 4,
    },
    xAxisLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        textAlign: 'center',
        width: 70,
    },
    tooltip: {
        position: 'absolute',
        top: 60,
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
        color: COLORS.tagPurple,
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
});

export default Chart10_SearchesByNeighborhood;
