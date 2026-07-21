import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { COLORS } from "../../../constants/colors";
import { useLocalModal } from "@/hooks/useLocalModal";
import { useToast } from "@/context/ToastContext";
import { Post } from "@/types";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { uploadImage } from "../../../services/uploadService";
import { AppInput } from "@/design-system/components/AppInput";
import { SelectionModal } from "@/components/modals";
import { logger } from "@/utils/logger";

const log = logger.scoped("OpenHousePost");

interface OpenHousePostProps {
  post: Post;
  errors: Record<string, string>;
  fechaHora: Date;
  setFechaHora: (date: Date) => void;
  fechaFinalizacion: Date | null;
  setFechaFinalizacion: (date: Date | null) => void;
  fotoPropiedad: string | null;
  setFotoPropiedad: (url: string | null) => void;
  ubicacion: string;
  setUbicacion: (ubicacion: string) => void;
  statusPost: string;
  setStatusPost: (status: string) => void;
}

export const OpenHousePost = ({
  post,
  errors,
  fechaHora,
  setFechaHora,
  fechaFinalizacion,
  setFechaFinalizacion,
  fotoPropiedad,
  setFotoPropiedad,
  ubicacion,
  setUbicacion,
  statusPost,
  setStatusPost,
}: OpenHousePostProps) => {
  const { showModal, modalElement } = useLocalModal();
  const { showToast } = useToast();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showStatusPost, setShowStatusPost] = useState(false);

  const handlePickAndUpload = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showModal({ title: "Permiso denegado", message: "Necesitamos acceso a tu galería", confirmText: "OK" });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        // Sin `allowsEditing`: el recorte nativo se quedaba SIN botón de
        // confirmar en algunos Android y los usuarios no podían salir. Se sube
        // la imagen tal cual seleccionada.
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploading(true);
        const url = await uploadImage(result.assets[0].uri, "posts");
        setFotoPropiedad(url);
      }
    } catch (error) {
      log.error("Error picking/uploading image:", error);
      showToast("No se pudo subir la imagen", "error");
    } finally {
      setUploading(false);
    }
  };

  const mainImage = fotoPropiedad || post.foto_propiedad;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Ubicación</Text>
        <AppInput
          placeholder="Ubicación"
          value={ubicacion}
          onChangeText={(text) => {
            setUbicacion(text);
          }}
          error={errors.ubicacion}
        />

        <Text style={styles.label}>Inicio del Open House</Text>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <Pressable
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.dateButtonText}>
              {fechaHora.toLocaleDateString("es-ES")}
            </Text>
          </Pressable>

          <Pressable
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.dateButtonText}>
              {fechaHora.toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>
          Termina el Open House
        </Text>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <Pressable
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.dateButtonText}>
              {fechaFinalizacion
                ? fechaFinalizacion.toLocaleDateString("es-ES")
                : "Seleccionar"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.dateButton}
            onPress={() => setShowEndTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.dateButtonText}>
              {fechaFinalizacion
                ? fechaFinalizacion.toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Seleccionar"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Visibilidad del Post</Text>
        <Pressable
          style={styles.statusButton}
          onPress={() => setShowStatusPost(true)}
        >
          <Text>{statusPost || "Seleccionar"}</Text>
          <Ionicons name="chevron-down" size={20} color={COLORS.primary} />
        </Pressable>
        <SelectionModal
          visible={showStatusPost}
          onClose={() => setShowStatusPost(false)}
          onSelect={(val) => {
            setStatusPost(val);
            setShowStatusPost(false);
          }}
          title="Estatus"
          options={["Oculto", "Visible"]}
          currentValue={statusPost}
        />
      </View>

      <DateTimeField
        visible={showDatePicker}
        value={fechaHora}
        mode="date"
        onClose={() => setShowDatePicker(false)}
        onPicked={(selectedDate) => {
          const newDate = new Date(fechaHora);
          newDate.setFullYear(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
          );
          setFechaHora(newDate);
        }}
      />

      <DateTimeField
        visible={showTimePicker}
        value={fechaHora}
        mode="time"
        onClose={() => setShowTimePicker(false)}
        onPicked={(selectedDate) => {
          const newDate = new Date(fechaHora);
          newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
          setFechaHora(newDate);
        }}
      />

      <DateTimeField
        visible={showEndDatePicker}
        value={fechaFinalizacion || new Date()}
        mode="date"
        onClose={() => setShowEndDatePicker(false)}
        onPicked={(selectedDate) => {
          const baseDate = fechaFinalizacion || new Date();
          const newDate = new Date(baseDate);
          newDate.setFullYear(
            selectedDate.getFullYear(),
            selectedDate.getMonth(),
            selectedDate.getDate(),
          );
          setFechaFinalizacion(newDate);
        }}
      />

      <DateTimeField
        visible={showEndTimePicker}
        value={fechaFinalizacion || new Date()}
        mode="time"
        onClose={() => setShowEndTimePicker(false)}
        onPicked={(selectedDate) => {
          const baseDate = fechaFinalizacion || new Date();
          const newDate = new Date(baseDate);
          newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
          setFechaFinalizacion(newDate);
        }}
      />

      <View style={styles.card}>
        <Text style={styles.label}>Imagen del Open House</Text>
        <View style={styles.imageWrapper}>
          {mainImage ? (
            <Image source={{ uri: mainImage }} style={styles.image} />
          ) : (
            <View
              style={[
                styles.image,
                {
                  backgroundColor: COLORS.background,
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons
                name="image-outline"
                size={40}
                color={COLORS.textTertiary}
              />
            </View>
          )}

          {uploading && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.uploadingText}>Subiendo...</Text>
            </View>
          )}
        </View>

        <View style={{ marginTop: 12, marginBottom: 16 }}>
          <Pressable
            onPress={handlePickAndUpload}
            disabled={uploading}
            style={[
              styles.uploadBtn,
              errors.images && styles.uploadBtnError,
              {
                width: "100%",
                flexDirection: "row",
                gap: 8,
                height: 50,
                opacity: uploading ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons name="camera" size={28} color={COLORS.textTertiary} />
            <Text style={styles.uploadText}>
              {mainImage ? "Cambiar Foto" : "Agregar Foto"}
            </Text>
          </Pressable>
        </View>
      </View>
      {modalElement}
    </View>
  );
};

/**
 * Picker de fecha/hora que funciona en ambas plataformas.
 * - Android: diálogo nativo; se cierra al elegir/cancelar.
 * - iOS: el `onChange` del picker dispara en CADA scroll de la rueda, así que
 *   NO se puede cerrar ahí (se cerraba al instante y "no aparecía el calendario").
 *   Se muestra dentro de un modal con botón "Listo" que es el que cierra.
 */
function DateTimeField({
  visible,
  value,
  mode,
  onPicked,
  onClose,
}: {
  visible: boolean;
  value: Date;
  mode: "date" | "time";
  onPicked: (d: Date) => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  if (Platform.OS === "android") {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        onChange={(event, selectedDate) => {
          onClose();
          if (event.type !== "dismissed" && selectedDate) onPicked(selectedDate);
        }}
      />
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={() => {}}>
          <View style={styles.pickerHeader}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.pickerDone}>Listo</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            themeVariant="light"
            locale="es-MX"
            onChange={(_e, selectedDate) => {
              if (selectedDate) onPicked(selectedDate);
            }}
            style={styles.iosPicker}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  iosPicker: {
    backgroundColor: COLORS.white,
  },
  container: {
    gap: 16,
  },
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
  statusButton: {
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
  },
  imageWrapper: {
    position: "relative",
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
});
