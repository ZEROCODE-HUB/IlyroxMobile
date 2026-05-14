import React, { useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { COLORS } from "../../constants";

interface TimePickerFieldProps {
    horaText: string;
    onTimeChange: (time: string) => void;
    disabled?: boolean;
}

const TimePickerField: React.FC<TimePickerFieldProps> = ({
    horaText,
    onTimeChange,
    disabled,
}) => {
    const [showTimePicker, setShowTimePicker] = useState(false);

    return (
        <View style={styles.field}>
            <Text style={styles.label}>
                <Ionicons
                    name="time-outline"
                    size={14}
                    color={COLORS.textSecondary}
                />
                {"  "}Hora
            </Text>
            <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={styles.inputContainer}
                activeOpacity={0.7}
                disabled={disabled}
            >
                <Text style={styles.inputText}>
                    {horaText || "Seleccionar hora"}
                </Text>
                <View style={styles.iconBadge}>
                    <Ionicons name="time" size={18} color={COLORS.primary} />
                </View>
            </TouchableOpacity>

            {showTimePicker && (
                <DateTimePicker
                    value={(() => {
                        const [h, m] = (horaText || "09:00").split(":").map(Number);
                        const d = new Date();
                        d.setHours(h, m, 0, 0);
                        return d;
                    })()}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                        if (Platform.OS === "android") setShowTimePicker(false);
                        if (selectedDate) {
                            const h = String(selectedDate.getHours()).padStart(2, "0");
                            const m = String(selectedDate.getMinutes()).padStart(2, "0");
                            onTimeChange(`${h}:${m}`);
                            if (Platform.OS === "ios") setShowTimePicker(false);
                        } else if (event.type === "dismissed") {
                            setShowTimePicker(false);
                        }
                    }}
                />
            )}
            <Text style={styles.hint}>Formato 24h (ej: 09:00, 14:30)</Text>
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
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: COLORS.lightGray,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    inputText: {
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: "500",
    },
    iconBadge: {
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        padding: 6,
        borderRadius: 8,
    },
    hint: {
        fontSize: 12,
        color: COLORS.textTertiary,
        marginTop: 6,
        marginLeft: 4,
    },
});

export default TimePickerField;
