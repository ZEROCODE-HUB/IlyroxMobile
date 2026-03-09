// ============================================
// ImageGallerySection - Sección de galería de imágenes
// ============================================

import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ReordenableImages from "../ReordenableImages";
import { COLORS } from "../../../constants/colors";

interface ImageGallerySectionProps {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  error?: string;
}

export const ImageGallerySection = React.memo(function ImageGallerySection({
  images,
  setImages,
  error,
}: ImageGallerySectionProps) {
  const handlePickImages = useCallback(async () => {
    if (images.length >= 15) {
      Alert.alert("Límite alcanzado", "Puedes subir máximo 15 imágenes");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería");
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
      <View style={styles.sectionHeader}>
        <Ionicons name="images" size={24} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Fotos de la Propiedad</Text>
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
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
