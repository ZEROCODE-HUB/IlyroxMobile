import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { SyncHistory as SyncHistoryType } from "@/hooks/hooks/useEasyBroker";

interface Props {
    history: SyncHistoryType[];
}

export const EasyBrokerHistory: React.FC<Props> = ({ history }) => {
    const formatDate = (dateString: string | null) => {
        if (!dateString) return "Nunca";
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return "Hace un momento";
        if (diffMins < 60) return `Hace ${diffMins}m`;
        if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)}h`;

        return date.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "short",
        });
    };

    if (history.length === 0) return null;

    return (
        <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>Sincronizaciones recientes</Text>

            {history.map((item) => {
                const isNoChanges =
                    item.status === "completada" &&
                    item.propiedades_nuevas === 0 &&
                    item.propiedades_actualizadas === 0 &&
                    item.errores === 0;

                return (
                    <View key={item.id} style={styles.historyCard}>
                        <View style={styles.historyCardHeader}>
                            <View
                                style={[
                                    styles.historyStatusDot,
                                    item.status === "error"
                                        ? styles.statusDotError
                                        : isNoChanges
                                            ? styles.statusDotWarning
                                            : styles.statusDotSuccess,
                                ]}
                            />
                            <Text style={styles.historyDate}>{formatDate(item.fecha)}</Text>
                        </View>

                        <View style={styles.historyStats}>
                            {item.propiedades_nuevas > 0 && (
                                <View style={styles.historyStatItem}>
                                    <Text style={styles.historyStatValue}>
                                        {item.propiedades_nuevas}
                                    </Text>
                                    <Text style={styles.historyStatLabel}>nuevas</Text>
                                </View>
                            )}
                            {item.propiedades_actualizadas > 0 && (
                                <View style={styles.historyStatItem}>
                                    <Text style={styles.historyStatValue}>
                                        {item.propiedades_actualizadas}
                                    </Text>
                                    <Text style={styles.historyStatLabel}>actualizadas</Text>
                                </View>
                            )}
                            {item.errores > 0 && (
                                <View style={styles.historyStatItem}>
                                    <Text
                                        style={[styles.historyStatValue, { color: COLORS.error }]}
                                    >
                                        {item.errores}
                                    </Text>
                                    <Text style={styles.historyStatLabel}>errores</Text>
                                </View>
                            )}
                            {isNoChanges && (
                                <Text style={styles.noChangesText}>Sin cambios</Text>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    historySection: {
        paddingHorizontal: 24,
        paddingTop: 8,
        marginBottom: 16,
    },
    historySectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    historyCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    historyCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    historyStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusDotSuccess: {
        backgroundColor: COLORS.success,
    },
    statusDotError: {
        backgroundColor: COLORS.error,
    },
    statusDotWarning: {
        backgroundColor: COLORS.warning,
    },
    historyDate: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: "500",
    },
    historyStats: {
        flexDirection: "row",
        gap: 20,
    },
    historyStatItem: {
        alignItems: "center",
    },
    historyStatValue: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.textPrimary,
    },
    historyStatLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    noChangesText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontStyle: "italic",
    },
});
