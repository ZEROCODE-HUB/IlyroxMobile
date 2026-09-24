import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppointmentCard from "../AppointmentCard";
import { COLORS } from "../../constants/colors";
import { AppointmentItem } from "./appointmentTypes";

interface AppointmentListProps {
    loading: boolean;
    appointments: AppointmentItem[];
    activeTab: "upcoming" | "past";
    onMarkCancel: (id: string) => void;
    onAcceptAppointment: (id: string) => void;
    onOpenRating: (id: string) => void;
    onSyncCalendar: (id: string) => void;
    onContact: (id: string) => void;
    onEdit: (id: string) => void;
    currentUserId?: string;
    onPropertyPress: (id: string) => void;
    onUserPress: (id: string) => void;
}

const AppointmentList: React.FC<AppointmentListProps> = ({
    loading,
    appointments,
    activeTab,
    onMarkCancel,
    onAcceptAppointment,
    onOpenRating,
    onSyncCalendar,
    onContact,
    onEdit,
    currentUserId,
    onPropertyPress,
    onUserPress,
}) => {
    if (loading) {
        return (
            <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando citas...</Text>
            </View>
        );
    }

    if (appointments.length === 0) {
        return (
            <View style={styles.emptyState}>
                <Ionicons
                    name="calendar-outline"
                    size={64}
                    color={COLORS.textDisabled}
                />
                <Text style={styles.emptyText}>
                    No hay citas{" "}
                    {activeTab === "upcoming" ? "próximas" : "anteriores"}
                </Text>
            </View>
        );
    }

    const groups = appointments.reduce<Record<string, AppointmentItem[]>>(
        (acc, appt) => {
            const key = appt.date;
            (acc[key] = acc[key] || []).push(appt);
            return acc;
        },
        {},
    );

    const formatDate = (dateStr: string): string => {
        if (!dateStr || typeof dateStr !== "string") {
            return "Fecha inválida";
        }
        const date = new Date(dateStr + "T00:00:00");
        if (isNaN(date.getTime())) {
            return "Fecha inválida";
        }
        const day = date.getDate();
        const months = [
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
        ];
        const monthIndex = date.getMonth();
        if (monthIndex < 0 || monthIndex > 11) {
            return "Fecha inválida";
        }
        return `${day} de ${months[monthIndex]}`;
    };

    const sectionTitle = (key: string, items: AppointmentItem[]): string => {
        if (activeTab !== "upcoming") return formatDate(items[0]?.fecha || key);
        if (key === "Hoy") {
            const fecha = items[0]?.fecha;
            return fecha ? `Hoy · ${formatDate(fecha)}` : "Hoy";
        }
        if (key === "Mañana") {
            const fecha = items[0]?.fecha;
            return fecha ? `Mañana · ${formatDate(fecha)}` : "Mañana";
        }
        return formatDate(key);
    };

    const isToday = (key: string): boolean => key === "Hoy";

    return (
        <View style={styles.list}>
            {Object.entries(groups).map(([key, items]) => (
                <View key={key} style={styles.section}>
                    <Text style={[styles.sectionTitle, isToday(key) && styles.sectionTitleToday]}>
                        {sectionTitle(key, items)}
                    </Text>
                    {items.map((appt) => (
                        <AppointmentCard
                            key={appt.id}
                            appointment={appt}
                            onMarkCancel={onMarkCancel}
                            onAcceptAppointment={onAcceptAppointment}
                            onOpenRating={onOpenRating}
                            onSyncCalendar={onSyncCalendar}
                            onContact={onContact}
                            onEdit={onEdit}
                            activeTab={activeTab}
                            currentUserId={currentUserId}
                            onPropertyPress={onPropertyPress}
                            onUserPress={onUserPress}
                        />
                    ))}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    loadingState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 60,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 12,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        borderStyle: "dashed",
    },
    emptyText: {
        marginTop: 16,
        color: COLORS.textTertiary,
        fontSize: 14,
    },
    list: {
        gap: 20,
    },
    section: {
        gap: 12,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.4,
    },
    sectionTitleToday: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.primary,
    },
});

export default AppointmentList;