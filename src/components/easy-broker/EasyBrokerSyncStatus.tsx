import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/colors";

interface Props {
    syncing: boolean;
    onSync: () => void;
}

export const EasyBrokerSyncStatus: React.FC<Props> = ({ syncing, onSync }) => {
    if (syncing) {
        return (
            <View style={styles.syncingCard}>
                <View style={styles.syncingHeader}>
                    <View style={styles.syncingDot} />
                    <Text style={styles.syncingTitle}>Sincronizando...</Text>
                </View>

                <Text style={styles.syncingDescription}>
                    Estamos importando tus propiedades desde EasyBroker. Puedes salir de
                    esta pantalla, te avisaremos cuando termine.
                </Text>

                <View style={styles.syncingProgress}>
                    <View style={styles.progressBarBg}>
                        <View style={styles.progressBarAnimated} />
                    </View>
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
    syncingProgress: {
        marginTop: 8,
    },
    progressBarBg: {
        height: 4,
        backgroundColor: COLORS.white,
        borderRadius: 2,
        overflow: "hidden",
    },
    progressBarAnimated: {
        height: "100%",
        width: "100%",
        backgroundColor: COLORS.warning,
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
