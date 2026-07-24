/**
 * DatePickerField.tsx
 * Selector de fecha de la cita.
 *
 * En iOS el spinner va dentro de un Modal con Cancelar/Listo y mantiene la
 * fecha en estado local (draft) hasta confirmar. Sin `themeVariant="light"` +
 * `textColor` la rueda hereda el trait oscuro del sistema y escribe texto
 * blanco sobre fondo claro (casi invisible). Mismo patrón que
 * CareerStartDateField.tsx del registro.
 */

import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { COLORS } from "../../constants";

interface DatePickerFieldProps {
    fechaText: string;
    onDateChange: (date: string) => void;
    disabled?: boolean;
}

function toLocalISODate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function tomorrow(): Date {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t;
}

function parseFecha(fechaText: string): Date {
    const parts = fechaText.split("-");
    if (parts.length === 3) {
        return new Date(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2]),
            12,
            0,
            0,
        );
    }
    return tomorrow();
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
    fechaText,
    onDateChange,
    disabled,
}) => {
    const [showPicker, setShowPicker] = useState(false);
    // Solo iOS: fecha en curso mientras se gira la rueda, sin confirmar aún.
    const [draftDate, setDraftDate] = useState<Date | null>(null);

    // Mínimo: mañana. Estable entre renders para no reiniciar la rueda.
    const minimumDate = useMemo(() => {
        const t = tomorrow();
        t.setHours(0, 0, 0, 0);
        return t;
    }, []);

    const selectedDate = parseFecha(fechaText);

    const openPicker = () => {
        setDraftDate(selectedDate);
        setShowPicker(true);
    };

    const handleAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
        setShowPicker(false);
        if (event.type === "set" && date) onDateChange(toLocalISODate(date));
    };

    const handleIOSChange = (_event: DateTimePickerEvent, date?: Date) => {
        if (date) setDraftDate(date);
    };

    const confirmIOS = () => {
        if (draftDate) onDateChange(toLocalISODate(draftDate));
        setShowPicker(false);
    };

    const cancelIOS = () => {
        setDraftDate(null);
        setShowPicker(false);
    };

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
                onPress={openPicker}
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

            {/* Android: diálogo nativo, se confirma solo */}
            {showPicker && Platform.OS === "android" && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    minimumDate={minimumDate}
                    onChange={handleAndroidChange}
                />
            )}

            {/* iOS: spinner dentro de un modal con Cancelar / Listo */}
            {showPicker && Platform.OS === "ios" && (
                <Modal
                    transparent
                    animationType="slide"
                    visible
                    onRequestClose={cancelIOS}
                >
                    <View style={styles.iosOverlay}>
                        <View style={styles.iosPickerContainer}>
                            <View style={styles.iosPickerHeader}>
                                <TouchableOpacity onPress={cancelIOS}>
                                    <Text style={styles.iosCancelButton}>Cancelar</Text>
                                </TouchableOpacity>
                                <Text style={styles.iosPickerTitle}>Fecha de la cita</Text>
                                <TouchableOpacity onPress={confirmIOS}>
                                    <Text style={styles.iosDoneButton}>Listo</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={draftDate ?? selectedDate}
                                mode="date"
                                display="spinner"
                                minimumDate={minimumDate}
                                locale="es-MX"
                                themeVariant="light"
                                textColor={COLORS.textPrimary}
                                onChange={handleIOSChange}
                                style={styles.iosPicker}
                            />
                        </View>
                    </View>
                </Modal>
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
    iosOverlay: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    iosPickerContainer: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 30,
    },
    iosPickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.cardBorder,
    },
    iosPickerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    iosCancelButton: {
        fontSize: 16,
        color: COLORS.textSecondary,
    },
    iosDoneButton: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
    },
    iosPicker: {
        height: 200,
    },
});

export default DatePickerField;
