import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BaseChartProps, PriceByRoomsData } from './types';
import { COLORS } from '../../constants/colors';

const priceByRooms: PriceByRoomsData[] = [
    { rooms: 1, avgPrice: 2100 },
    { rooms: 2, avgPrice: 3200 },
    { rooms: 3, avgPrice: 4500 },
    { rooms: 4, avgPrice: 6200 },
    { rooms: 5, avgPrice: 8500 },
];

interface Chart13Props extends BaseChartProps { }

const Chart13_PriceByRooms: React.FC<Chart13Props> = ({ onPress, activePoint }) => {
    const maxPrice = Math.max(...priceByRooms.map(d => d.avgPrice));

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Precio vs Habitaciones</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>

            <View style={styles.chartContainer}>
                {priceByRooms.map((d, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.barWrapper}
                        onPress={() => onPress?.('chart13', index, d)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.barValue}>${d.avgPrice.toLocaleString()}</Text>
                        <View style={styles.barTrack}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        height: `${(d.avgPrice / maxPrice) * 100}%`,
                                        backgroundColor: activePoint?.chart === 'chart13' && activePoint?.index === index ? COLORS.successDark : COLORS.success
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.xAxisLabel}>{d.rooms}h</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activePoint?.chart === 'chart13' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>Precio Promedio</Text>
                    <Text style={styles.tooltipValue}>${priceByRooms[activePoint.index].avgPrice.toLocaleString()}</Text>
                    <Text style={styles.tooltipLabel}>{priceByRooms[activePoint.index].rooms} habitación{priceByRooms[activePoint.index].rooms > 1 ? 'es' : ''}</Text>
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
        height: 200,
        paddingHorizontal: 8,
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
        gap: 6,
    },
    barTrack: {
        width: '80%',
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
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.success,
        marginBottom: 4,
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
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.success,
        marginBottom: 2,
    },
    tooltipLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
});

export default Chart13_PriceByRooms;
