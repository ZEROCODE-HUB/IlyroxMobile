import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { BaseChartProps, TopAmenitiesData } from './types';
import { COLORS } from '../../constants/colors';

const topAmenities: TopAmenitiesData[] = [
    { amenity: 'Amueblada', count: 287 },
    { amenity: 'Garaje', count: 245 },
    { amenity: 'Jardín', count: 198 },
    { amenity: 'Pet Friendly', count: 176 },
    { amenity: 'Seguridad', count: 167 },
    { amenity: 'Gym', count: 134 },
];

interface Chart11Props extends BaseChartProps { }

const Chart11_TopAmenities: React.FC<Chart11Props> = ({ onPress, activePoint }) => {
    const maxCount = Math.max(...topAmenities.map(d => d.count));

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Amenidades Más Buscadas</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chartContainerHorizontal}>
                    {topAmenities.map((d, index) => {
                        const isActive = activePoint?.chart === 'chart11' && activePoint?.index === index;

                        return (
                            <TouchableOpacity
                                key={index}
                                style={styles.barWrapperHorizontal}
                                onPress={() => onPress?.('chart11', index, d)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.barValue}>{d.count}</Text>
                                <View style={styles.barTrack}>
                                    <View
                                        style={[
                                            styles.barFill,
                                            {
                                                height: `${(d.count / maxCount) * 100}%`,
                                                backgroundColor: isActive ? COLORS.primaryDark : COLORS.primary,
                                                width: 40
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.xAxisLabel}>{d.amenity}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {activePoint?.chart === 'chart11' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipTitle}>Búsquedas</Text>
                    <Text style={styles.tooltipValue}>{topAmenities[activePoint.index].count}</Text>
                    <Text style={styles.tooltipLabel}>{topAmenities[activePoint.index].amenity}</Text>
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
    chartContainerHorizontal: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 200,
        gap: 20,
    },
    barWrapperHorizontal: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'flex-end',
        gap: 6,
        width: 70,
    },
    barTrack: {
        width: '100%',
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
        color: COLORS.primary,
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
        color: COLORS.textSecondary,
    },
});

export default Chart11_TopAmenities;
