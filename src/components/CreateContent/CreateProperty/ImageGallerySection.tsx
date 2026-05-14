// ============================================
// ImageGallerySection - Sección de galería de imágenes
// ============================================

import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useModal } from "@/context/ModalContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReordenableImages from "../ReordenableImages";
import { COLORS } from "../../../constants/colors";
import { usePropertyFormContext } from "./PropertyFormContext";

export const ImageGallerySection = React.memo(function ImageGallerySection() {
  const { images, setImages, errors } = usePropertyFormContext();
  const error = errors.images;
  const { showModal } = useModal();
  const handlePickImages = useCallback(async () => {
    if (images.length >= 15) {
      showModal({ title: "Límite alcanzado", message: "Puedes subir máximo 15 imágenes", confirmText: "OK" });
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showModal({ title: "Permiso denegado", message: "Necesitamos acceso a tu galería", confirmText: "OK" });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 15 - images.length,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 15));
    }
  }, [images.length, setImages]);

  const handleRemoveImage = useCallback(
    (index: number) => {
      setImages((prev) => prev.filter((_, i) => i !== index));
    },
    [setImages],
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderBand}>
        <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
        <Text style={styles.sectionTitleBand}>Fotos de la Propiedad</Text>
      </View>
      <Text style={styles.hint}>
        Mínimo 1 imagen, máximo 15 ({images.length}/15)
      </Text>

      <GestureHandlerRootView>
        <ReordenableImages
          images={images}
          onReorder={(newOrder) => setImages(newOrder)}
          onRemove={handleRemoveImage}
        />
      </GestureHandlerRootView>

      {images.length < 15 && (
        <TouchableOpacity
          onPress={handlePickImages}
          style={[
            styles.uploadBtn,
            error && styles.uploadBtnError,
            { marginTop: 12 },
          ]}
        >
          <Ionicons name="camera" size={32} color={COLORS.textTertiary} />
          <Text style={styles.uploadText}>Agregar</Text>
        </TouchableOpacity>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderBand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary + "12",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  sectionTitleBand: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 12,
  },
  uploadBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textDisabled,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  uploadBtnError: {
    borderColor: COLORS.error,
  },
  uploadText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 5,
    marginBottom: 12,
  },
});
