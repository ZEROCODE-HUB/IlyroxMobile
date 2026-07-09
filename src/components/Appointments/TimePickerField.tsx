/**
 * TimePickerField.tsx
 * Selector de hora de la cita (formato 24h).
 *
 * En iOS el spinner va dentro de un Modal con Cancelar/Listo y mantiene la
 * hora en estado local (draft) hasta confirmar. Sin `themeVariant="light"` +
 * `textColor` la rueda hereda el trait oscuro del sistema y escribe texto
 * blanco sobre fondo claro (casi invisible). Mismo patrón que
 * CareerStartDateField.tsx del registro.
 */

import React, { useState } from "react";
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

interface TimePickerFieldProps {
    horaText: string;
    onTimeChange: (time: string) => void;
    disabled?: boolean;
}

function toHM(date: Date): string {
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

function parseHora(horaText: string): Date {
    const [h, m] = (horaText || "09:00").split(":").map(Number);
    const d = new Date();
    d.setHours(h || 9, m || 0, 0, 0);
    return d;
}

const TimePickerField: React.FC<TimePickerFieldProps> = ({
    horaText,
    onTimeChange,
    disabled,
}) => {
    const [showPicker, setShowPicker] = useState(false);
    // Solo iOS: hora en curso mientras se gira la rueda, sin confirmar aún.
    const [draftDate, setDraftDate] = useState<Date | null>(null);

    const selectedDate = parseHora(horaText);

    const openPicker = () => {
        setDraftDate(selectedDate);
        setShowPicker(true);
    };

    const handleAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
        setShowPicker(false);
        if (event.type === "set" && date) onTimeChange(toHM(date));
    };

    const handleIOSChange = (_event: DateTimePickerEvent, date?: Date) => {
        if (date) setDraftDate(date);
    };

    const confirmIOS = () => {
        if (draftDate) onTimeChange(toHM(draftDate));
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
                    name="time-outline"
                    size={14}
                    color={COLORS.textSecondary}
                />
                {"  "}Hora
            </Text>
            <TouchableOpacity
                onPress={openPicker}
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

            {/* Android: diálogo nativo, se confirma solo */}
            {showPicker && Platform.OS === "android" && (
                <DateTimePicker
                    value={selectedDate}
                    mode="time"
                    is24Hour={true}
                    display="default"
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
                                <Text style={styles.iosPickerTitle}>Hora de la cita</Text>
                                <TouchableOpacity onPress={confirmIOS}>
                                    <Text style={styles.iosDoneButton}>Listo</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={draftDate ?? selectedDate}
                                mode="time"
                                is24Hour={true}
                                display="spinner"
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

export default TimePickerField;
