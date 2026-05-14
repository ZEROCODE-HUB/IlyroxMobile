import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";
import { SyncProgress } from "@/hooks/useEasyBroker";

interface Props {
    syncing: boolean;
    syncProgress: SyncProgress | null;
    onSync: () => void;
}

export const EasyBrokerSyncStatus: React.FC<Props> = ({ syncing, syncProgress, onSync }) => {
    if (syncing) {
        const hasProgress = syncProgress != null && syncProgress.total > 0;
        const pct = hasProgress
            ? Math.min(syncProgress.procesadas / syncProgress.total, 1)
            : 0;

        return (
            <View style={styles.syncingCard}>
                <View style={styles.syncingHeader}>
                    <View style={styles.syncingDot} />
                    <Text style={styles.syncingTitle}>Sincronizando...</Text>
                    {hasProgress && (
                        <Text style={styles.syncingCounter}>
                            {syncProgress.procesadas}/{syncProgress.total}
                        </Text>
                    )}
                </View>

                <Text style={styles.syncingDescription}>
                    {hasProgress
                        ? `Procesando propiedad ${syncProgress.procesadas} de ${syncProgress.total}. Puedes salir, te avisaremos cuando termine.`
                        : "Estamos importando tus propiedades desde EasyBroker. Puedes salir de esta pantalla, te avisaremos cuando termine."}
                </Text>

                <View style={styles.syncingProgress}>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[
                                styles.progressBarFill,
                                hasProgress
                                    ? { width: `${Math.round(pct * 100)}%` }
                                    : styles.progressBarAnimated,
                            ]}
                        />
                    </View>
                    {hasProgress && (
                        <Text style={styles.progressPct}>{Math.round(pct * 100)}%</Text>
                    )}
                </View>
            </View>
        );
    }

    return (
        <TouchableOpacity style={styles.syncButton} onPress={onSync}>
            <Ionicons name="sync-outline" size={24} color={COLORS.white} />
            <View style={styles.syncButtonContent}>
                <Text style={styles.syncButtonTitle}>Sincronizar ahora</Text>
                <Text style={styles.syncButtonSubtitle}>
                    Importar propiedades de EasyBroker
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    syncingCard: {
        backgroundColor: COLORS.warningLight,
        marginHorizontal: 24,
        marginBottom: 16,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.warning,
    },
    syncingHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
    },
    syncingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.warning,
    },
    syncingTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.warningDark,
    },
    syncingDescription: {
        fontSize: 14,
        color: COLORS.warningDark,
        lineHeight: 20,
        marginBottom: 16,
    },
    syncingCounter: {
        marginLeft: "auto",
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.warningDark,
    },
    syncingProgress: {
        marginTop: 8,
        gap: 4,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: COLORS.white,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: COLORS.warning,
        borderRadius: 3,
    },
    progressBarAnimated: {
        width: "60%",
    },
    progressPct: {
        fontSize: 11,
        color: COLORS.warningDark,
        textAlign: "right",
        fontWeight: "600",
    },
    syncButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.primaryLight,
        marginHorizontal: 24,
        marginBottom: 16,
        borderRadius: 20,
        padding: 20,
        gap: 16,
    },
    syncButtonContent: {
        flex: 1,
    },
    syncButtonTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.white,
        marginBottom: 2,
    },
    syncButtonSubtitle: {
        fontSize: 13,
        color: COLORS.whiteTransparent80,
    },
});
