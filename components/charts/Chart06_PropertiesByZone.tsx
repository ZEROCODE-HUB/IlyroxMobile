import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BaseChartProps, PropertiesByZoneData } from './types';
import { COLORS } from '../../constants/colors';

const propertiesByZone: PropertiesByZoneData[] = [
    { zone: 'Centro', count: 198 },
    { zone: 'Norte', count: 156 },
    { zone: 'Sur', count: 234 },
    { zone: 'Este', count: 123 },
    { zone: 'Oeste', count: 178 },
    { zone: 'Periférico', count: 98 },
];

interface Chart06Props extends BaseChartProps { }

const Chart06_PropertiesByZone: React.FC<Chart06Props> = ({ onPress, activePoint }) => {
    const maxCount = Math.max(...propertiesByZone.map(d => d.count));

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Inventario por Zona</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>
            <View style={styles.verticalList}>
                {propertiesByZone.map((d, index) => {
                    const isActive = activePoint?.chart === 'chart6' && activePoint?.index === index;

                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => onPress?.('chart6', index, d)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.rowHeader}>
                                <Text style={styles.rowLabel}>{d.zone}</Text>
                                <Text style={[styles.rowValueText, isActive && { color: COLORS.primaryDark }]}>{d.count}</Text>
                            </View>
                            <View style={styles.rowTrack}>
                                <View
                                    style={[
                                        styles.rowFill,
                                        {
                                            width: `${(d.count / maxCount) * 100}%`,
                                            backgroundColor: isActive ? COLORS.primaryDark : COLORS.primary
                                        }
                                    ]}
                                />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {activePoint?.chart === 'chart6' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>Propiedades</Text>
                    <Text style={styles.tooltipValue}>{propertiesByZone[activePoint.index].count}</Text>
                    <Text style={styles.tooltipLabel}>{propertiesByZone[activePoint.index].zone}</Text>
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
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    rowValueText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.primary,
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
        borderColor: COLORS.primary,
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
        color: COLORS.primary,
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 11,
        color: COLORS.textTertiary,
    },
});

export default Chart06_PropertiesByZone;
