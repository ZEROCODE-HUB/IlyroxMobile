/**
 * CareerStartDateField.tsx
 * Selector de "fecha de inicio de carrera" compartido por el registro
 * (RegisterStepTwo) y el alta tras auth externa (ExternalAuthForm).
 *
 * En iOS el spinner mantiene la fecha en estado local y solo la confirma al
 * pulsar "Listo": si se propagara en cada tick, el re-render del formulario
 * recrearía `value`/`maximumDate` y la rueda se reiniciaría sola.
 */

import React, { useMemo, useState } from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { COLORS } from "../../../constants/colors";

interface CareerStartDateFieldProps {
  /** Fecha en formato ISO `yyyy-mm-dd`, o cadena vacía si aún no se eligió. */
  value: string;
  onChange: (isoDate: string) => void;
  /** Texto mostrado cuando no hay fecha seleccionada. */
  label: string;
  buttonStyle?: StyleProp<ViewStyle>;
}

/**
 * Serializa a `yyyy-mm-dd` usando los componentes locales de la fecha.
 * `toISOString()` convierte a UTC antes de recortar, así que una fecha a
 * medianoche local en un huso UTC+ retrocede al día (y año) anterior.
 */
function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(isoDate: string): Date {
  return new Date(isoDate + "T12:00:00");
}

function formatDate(isoDate: string): string {
  return parseISODate(isoDate).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function defaultDate(): Date {
  return new Date(new Date().getFullYear() - 5, 0, 1);
}

export function CareerStartDateField({
  value,
  onChange,
  label,
  buttonStyle,
}: CareerStartDateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  // Solo iOS: fecha en curso mientras se gira la rueda, sin tocar el formulario.
  const [draftDate, setDraftDate] = useState<Date | null>(null);

  // Estable entre renders: si se recreara, el picker nativo se reiniciaría.
  const maximumDate = useMemo(() => new Date(), []);

  const selectedDate = value ? parseISODate(value) : defaultDate();

  const openPicker = () => {
    setDraftDate(selectedDate);
    setShowPicker(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(false);
    if (event.type === "set" && date) {
      onChange(toLocalISODate(date));
    }
  };

  const handleIOSChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (date) setDraftDate(date);
  };

  const confirmIOS = () => {
    if (draftDate) onChange(toLocalISODate(draftDate));
    setShowPicker(false);
  };

  const cancelIOS = () => {
    setDraftDate(null);
    setShowPicker(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selectButton, buttonStyle]}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
          {value ? formatDate(value) : label}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {/* Android: diálogo nativo, se confirma solo */}
      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          maximumDate={maximumDate}
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
                <Text style={styles.iosPickerTitle}>Fecha de inicio</Text>
                <TouchableOpacity onPress={confirmIOS}>
                  <Text style={styles.iosDoneButton}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draftDate ?? selectedDate}
                mode="date"
                display="spinner"
                maximumDate={maximumDate}
                locale="es-MX"
                // El contenedor es claro: sin esto la rueda hereda el trait
                // oscuro del sistema y escribe texto blanco sobre blanco.
                themeVariant="light"
                textColor={COLORS.textPrimary}
                onChange={handleIOSChange}
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  selectText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    flex: 1,
  },
  selectPlaceholder: {
    color: COLORS.textTertiary,
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
