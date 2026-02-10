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

interface DatePickerFieldProps {
    fechaText: string;
    onDateChange: (date: string) => void;
    disabled?: boolean;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
    fechaText,
    onDateChange,
    disabled,
}) => {
    const [showDatePicker, setShowDatePicker] = useState(false);

    return (
        <View style={styles.field}>
            <Text style={styles.label}>
                <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={COLORS.textSecondary}
                />
                {"  "}Fecha
            </Text>
            <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.inputContainer}
                activeOpacity={0.7}
                disabled={disabled}
            >
                <Text style={styles.inputText}>
                    {fechaText
                        ? fechaText.split("-").reverse().join("/")
                        : "Seleccionar fecha"}
                </Text>
                <View style={styles.iconBadge}>
                    <Ionicons name="calendar" size={18} color={COLORS.primary} />
                </View>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={(() => {
                        const parts = fechaText.split("-");
                        if (parts.length === 3) {
                            return new Date(
                                parseInt(parts[0]),
                                parseInt(parts[1]) - 1,
                                parseInt(parts[2]),
                            );
                        }
                        return new Date();
                    })()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    minimumDate={new Date(new Date().getTime() + 24 * 60 * 60 * 1000)}
                    onChange={(event, selectedDate) => {
                        if (Platform.OS === "android") setShowDatePicker(false);
                        if (selectedDate) {
                            const y = selectedDate.getFullYear();
                            const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
                            const d = String(selectedDate.getDate()).padStart(2, "0");
                            onDateChange(`${y}-${m}-${d}`);
                            if (Platform.OS === "ios") setShowDatePicker(false);
                        } else if (event.type === "dismissed") {
                            setShowDatePicker(false);
                        }
                    }}
                />
            )}
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
        backgroundColor: "#F9FAFB",
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
});

export default DatePickerField;
