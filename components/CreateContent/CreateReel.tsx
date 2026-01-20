import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useCreateContent } from "../../hooks/useCreateContent";
import { useVideoUpload } from "../../hooks/useVideoUpload";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/colors";
import { ScreenWrapper } from "../../screens/ScreenWrapper";
import * as Burnt from "burnt";
import { supabase } from "../../lib/supabase";

interface CreateReelProps {
  reelId?: string;
  onBack: () => void;
}

export default function CreateReel({ onBack, reelId }: CreateReelProps) {
  const { user } = useAuth();
  const isEditing = !!reelId;

  const {
    createReel,
    updateReel,
    uploading: creatingReel,
  } = useCreateContent(user?.id);
  const {
    uploadVideo,
    uploading: uploadingVideo,
    uploadProgress,
  } = useVideoUpload();

  const [description, setDescription] = useState("");
  const [videoUri, setVideoUri] = useState("");
  const [thumbnailUri, setThumbnailUri] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingReel, setLoadingReel] = useState(false);

  const uploading = uploadingVideo || creatingReel;

  useEffect(() => {
    if (isEditing) {
      loadReelData();
    }
  }, [reelId]);

  const loadReelData = async () => {
    try {
      setLoadingReel(true);
      const { data, error } = await supabase
        .from("reels")
        .select("*")
        .eq("id", reelId)
        .single();

      if (error) throw error;

      if (data) {
        setDescription(data.description || "");
        setVideoUri(data.video_url);
      }
    } catch (error) {
      console.error("Error loading reel:", error);
      Alert.alert("Error", "No se pudo cargar la información del reel");
    } finally {
      setLoadingReel(false);
    }
  };

  /**
   * Generar thumbnail del video
   */
  const generateThumbnail = async (videoUri: string) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000, // Captura en el segundo 1
        quality: 0.8,
      });
      setThumbnailUri(uri);
      return uri;
    } catch (error) {
      console.error("Error generando thumbnail:", error);
      return null;
    }
  };

  /**
   * Seleccionar video de la galería
   */
  const handlePickVideo = async () => {
    // Pedir permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería");
      return;
    }

    // Abrir galería (solo videos)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60, // Máximo 60 segundos
    });

    if (!result.canceled && result.assets[0]) {
      const videoUri = result.assets[0].uri;
      setVideoUri(videoUri);

      // Generar thumbnail automáticamente
      await generateThumbnail(videoUri);

      if (errors.video) {
        setErrors({ ...errors, video: "" });
      }
    }
  };

  /**
   * Validar formulario
   */
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!videoUri) {
      newErrors.video = "Debes seleccionar un video";
    }

    if (!description.trim()) {
      newErrors.description = "La descripción no puede estar vacía";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Publicar reel
   */
  const handlePublish = async () => {
    if (!validate()) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    try {
      // 1. Subir video a Supabase Storage
      const videoUrl = await uploadVideo(videoUri, "feed-images", "reels");

      if (!videoUrl) {
        Alert.alert("Error", "No se pudo subir el video. Intenta de nuevo.");
        return;
      }

      // 2. Subir thumbnail si existe
      let thumbnailUrl = null;
      if (thumbnailUri) {
        thumbnailUrl = await uploadVideo(
          thumbnailUri,
          "feed-images",
          "thumbnails",
        );
      }

      // 3. Crear o Actualizar el reel
      let success = false;
      if (isEditing && reelId) {
        success = await updateReel(reelId, description, videoUrl, thumbnailUrl);
      } else {
        success = await createReel(description, videoUrl, thumbnailUrl);
      }

      if (success) {
        // Limpiar formulario y volver
        setTimeout(() => {
          setDescription("");
          setVideoUri("");
          setThumbnailUri("");
          onBack();
        }, 500);
      }
    } catch (error) {
      console.error("Error publishing reel:", error);
      Alert.alert("Error", "Hubo un problema al publicar el reel");
    }
  };

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Reel</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Video */}
        <View style={styles.card}>
          <Text style={styles.label}>Video *</Text>
          <Text style={styles.hint}>Máximo 60 segundos</Text>

          {videoUri ? (
            <View style={styles.videoPreview}>
              <Ionicons name="videocam" size={48} color={COLORS.primary} />
              <Text style={styles.videoText}>Video seleccionado</Text>
              <TouchableOpacity
                onPress={() => {
                  setVideoUri("");
                  setThumbnailUri("");
                  if (errors.video) {
                    setErrors({ ...errors, video: "" });
                  }
                }}
                style={styles.removeVideoBtn}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                <Text style={styles.removeVideoText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={handlePickVideo}
                style={[
                  styles.uploadVideoBtn,
                  errors.video && styles.inputError,
                ]}
              >
                <Ionicons
                  name="videocam-outline"
                  size={56}
                  color={COLORS.textTertiary}
                />
                <Text style={styles.uploadText}>Seleccionar video</Text>
              </TouchableOpacity>
              {errors.video && (
                <Text style={styles.errorText}>{errors.video}</Text>
              )}
            </>
          )}
        </View>

        {/* Descripción */}
        <View style={styles.card}>
          <AppInput
            label="Descripción"
            placeholder="¿De qué trata tu reel?"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              if (errors.description) {
                setErrors({ ...errors, description: "" });
              }
            }}
            multiline
            numberOfLines={4}
            maxLength={500}
            error={errors.description}
          />
        </View>
      </ScrollView>

      {/* Botón Publicar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.publishBtn, uploading && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <ActivityIndicator color={COLORS.white} />
              <Text style={styles.publishText}>Publicando...</Text>
            </>
          ) : (
            <>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={COLORS.white}
              />
              <Text style={styles.publishText}>
                {isEditing ? "Editar Reel" : "Publicar Reel"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de Progreso */}
      <Modal visible={uploading} transparent animationType="fade">
        <View style={styles.uploadModalOverlay}>
          <View style={styles.uploadModalContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.uploadModalTitle}>Subiendo reel...</Text>
            <Text style={styles.uploadModalSubtitle}>
              {uploadProgress}% completado
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[styles.progressBar, { width: `${uploadProgress}%` }]}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  hint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 12,
  },

  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
  },
  videoPreview: {
    height: 200,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  videoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  removeVideoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  removeVideoText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: "500",
  },
  uploadVideoBtn: {
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    gap: 12,
  },
  uploadText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingBottom: 50,
  },
  publishBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  uploadModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.blackTransparent80,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    minWidth: 280,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  uploadModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  uploadModalSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 16,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: COLORS.cardBorder,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
});
