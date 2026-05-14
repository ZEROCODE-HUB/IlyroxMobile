import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";
import { Stats } from "@/hooks/useEasyBroker";

interface Props {
    stats: Stats;
}

export const EasyBrokerStats: React.FC<Props> = ({ stats }) => {
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

    return (
        <View style={styles.headerStats}>
            <View style={styles.mainStatCard}>
                <Text style={styles.mainStatLabel}>Propiedades sincronizadas</Text>
                <Text style={styles.mainStatValue}>{stats.total}</Text>
                <Text style={styles.mainStatSubtext}>
                    {stats.lastSync
                        ? `Última vez ${formatDate(stats.lastSync)}`
                        : "Nunca sincronizado"}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    headerStats: {
        padding: 24,
        paddingBottom: 16,
    },
    mainStatCard: {
        backgroundColor: COLORS.primary,
        borderRadius: 24,
        padding: 24,
        alignItems: "center",
    },
    mainStatLabel: {
        fontSize: 14,
        color: COLORS.whiteTransparent80,
        marginBottom: 8,
        fontWeight: "500",
    },
    mainStatValue: {
        fontSize: 48,
        fontWeight: "bold",
        color: COLORS.white,
        marginBottom: 4,
    },
    mainStatSubtext: {
        fontSize: 13,
        color: COLORS.whiteTransparent70,
    },
});
