import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";

export const APPOINTMENT_TYPES = [
    { value: "visita", label: "Visita a propiedad", icon: "home-outline" },
    { value: "llamada", label: "Llamada telefónica", icon: "call-outline" },
    { value: "videollamada", label: "Videollamada", icon: "videocam-outline" },
    { value: "reunion", label: "Reunión presencial", icon: "people-outline" },
];

interface AppointmentTypeSelectorProps {
    selectedType: string;
    onTypeChange: (type: string) => void;
    disabled?: boolean;
}

const AppointmentTypeSelector: React.FC<AppointmentTypeSelectorProps> = ({
    selectedType,
    onTypeChange,
    disabled,
}) => {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>
                <Ionicons
                    name="options-outline"
                    size={14}
                    color={COLORS.textSecondary}
                />
                {"  "}Tipo de cita
            </Text>
            <View style={styles.typeGrid}>
                {APPOINTMENT_TYPES.map((type) => (
                    <TouchableOpacity
                        key={type.value}
                        style={[
                            styles.typeButton,
                            selectedType === type.value && styles.typeButtonActive,
                        ]}
                        onPress={() => onTypeChange(type.value)}
                        disabled={disabled}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={type.icon as any}
                            size={18}
                            color={
                                selectedType === type.value
                                    ? COLORS.primary
                                    : COLORS.textTertiary
                            }
                        />
                        <Text
                            style={[
                                styles.typeButtonText,
                                selectedType === type.value && styles.typeButtonTextActive,
                            ]}
                        >
                            {type.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    field: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: 10,
    },
    typeGrid: {
        gap: 10,
    },
    typeButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#E5E5E5",
        gap: 12,
    },
    typeButtonActive: {
        backgroundColor: "#F0FDFA",
        borderColor: COLORS.primary,
    },
    typeButtonText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    typeButtonTextActive: {
        color: COLORS.primary,
        fontWeight: "600",
    },
});

export default AppointmentTypeSelector;
