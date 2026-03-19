import { COLORS } from "@/constants/colors";
import { AppInput } from "@/design-system/components/AppInput";
import { Post } from "@/types";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface BusquedaPostProps {
  post: Post;
  precioMin: string;
  setPrecioMin: (val: string) => void;
  precioMax: string;
  setPrecioMax: (val: string) => void;
  habitaciones: string;
  setHabitaciones: (val: string) => void;
  operacion: string;
  setOperacion: (val: string) => void;
}

export const BusquedaPost = ({
  post,
  precioMin,
  setPrecioMin,
  precioMax,
  setPrecioMax,
  habitaciones,
  setHabitaciones,
  operacion,
  setOperacion,
}: BusquedaPostProps) => {

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Parámetros de Búsqueda</Text>

      <View style={{ marginTop: 12, gap: 16 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Precio Mínimo"
              placeholder="Ej. 1000000"
              keyboardType="numeric"
              value={precioMin}
              onChangeText={setPrecioMin}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Precio Máximo"
              placeholder="Ej. 5000000"
              keyboardType="numeric"
              value={precioMax}
              onChangeText={setPrecioMax}
            />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Habitaciones"
              placeholder="Ej. 3"
              keyboardType="numeric"
              value={habitaciones}
              onChangeText={setHabitaciones}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppInput
              label="Operación"
              placeholder="Venta / Renta"
              value={operacion}
              onChangeText={setOperacion}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  uploadBtn: {
    width: 120,
    height: 125,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  uploadText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 6,
    textAlign: "center",
  },
  uploadBtnError: {
    borderColor: COLORS.error,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginTop: 12,
  },
});
