import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BaseChartProps, SaleTimeData } from './types';
import { COLORS } from '../../constants/colors';

const saleTimeNewVsUsed: SaleTimeData[] = [
    { type: 'Nuevos', days: 80 },
    { type: 'Usados', days: 15 },
];

interface Chart08Props extends BaseChartProps { }

const Chart08_SaleTimeNewVsUsed: React.FC<Chart08Props> = ({ onPress, activePoint }) => {
    const maxDays = Math.max(...saleTimeNewVsUsed.map(d => d.days));

    return (
        <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Comparación de Tiempo de Venta Nuevos / Usados</Text>
            <Text style={styles.chartSubtitle}>Filtros: Tipo: Habitacional | Operación: venta</Text>

            <View style={styles.chartContainer}>
                {saleTimeNewVsUsed.map((d, index) => {
                    const isActive = activePoint?.chart === 'chart8' && activePoint?.index === index;

                    return (
                        <TouchableOpacity
                            key={index}
                            style={styles.barWrapper}
                            onPress={() => onPress?.('chart8', index, d)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            height: `${(d.days / maxDays) * 100}%`,
                                            backgroundColor: isActive
                                                ? (index === 0 ? COLORS.primaryDark : COLORS.warningDark)
                                                : (index === 0 ? COLORS.primary : COLORS.warning),
                                        }
                                    ]}
                                >
                                    <Text style={styles.barValueInside}>{d.days}</Text>
                                </View>
                            </View>
                            <Text style={styles.xAxisLabel}>{d.type}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {activePoint?.chart === 'chart8' && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>{saleTimeNewVsUsed[activePoint.index].days} días</Text>
                    <Text style={styles.tooltipSubtext}>({saleTimeNewVsUsed[activePoint.index].type})</Text>
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
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 240,
        paddingHorizontal: 20,
    },
    barWrapper: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
        gap: 12,
        maxWidth: 150,
    },
    barTrack: {
        width: '100%',
        height: '80%',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    barFill: {
        width: '70%',
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 60,
    },
    barValueInside: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    xAxisLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    tooltip: {
        position: 'absolute',
        top: 70,
        right: 30,
        backgroundColor: COLORS.warning,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        zIndex: 10,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    tooltipText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    tooltipSubtext: {
        color: COLORS.white,
        fontSize: 11,
    },
});

export default Chart08_SaleTimeNewVsUsed;
