import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

interface AppointmentTabsProps {
    activeTab: "upcoming" | "past";
    onTabChange: (tab: "upcoming" | "past") => void;
}

const AppointmentTabs: React.FC<AppointmentTabsProps> = ({
    activeTab,
    onTabChange,
}) => {
    return (
        <View style={styles.tabContainer}>
            <TouchableOpacity
                onPress={() => onTabChange("upcoming")}
                style={[styles.tab, activeTab === "upcoming" && styles.activeTab]}
            >
                <Text
                    style={[
                        styles.tabText,
                        activeTab === "upcoming" && styles.activeTabText,
                    ]}
                >
                    Próximas
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => onTabChange("past")}
                style={[styles.tab, activeTab === "past" && styles.activeTab]}
            >
                <Text
                    style={[
                        styles.tabText,
                        activeTab === "past" && styles.activeTabText,
                    ]}
                >
                    Historial
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    tabContainer: {
        flexDirection: "row",
        backgroundColor: COLORS.backgroundDark,
        padding: 4,
        borderRadius: 12,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: COLORS.white,
        shadowColor: COLORS.black,
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.textSecondary,
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: "700",
    },
});

export default AppointmentTabs;
