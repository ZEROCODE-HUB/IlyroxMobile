import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../design-system/components/AppInput";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { useVideoPlayer, VideoView } from "expo-video"; // Asegúrate de tener expo-video instalado

import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/colors";
import { ScreenWrapper } from "../../screens/ScreenWrapper";
import { supabase } from "../../lib/supabase";
import { useCreateContent } from "@/hooks/hooks/useCreateContent";
import { useVideoUpload } from "@/hooks/hooks";
import { AppHeader } from "../AppHeader";

interface CreateReelProps {
  reelId?: string;
  onBack: () => void;
}

const VideoPreview = ({
  uri,
  thumbnail,
  onRemove,
}: {
  uri: string;
  thumbnail?: string;
  onRemove: () => void;
}) => {
  const [isMuted, setIsMuted] = useState(true);

  // Inicializamos el player.
  // Importante: Este componente se remontará gracias a la 'key' en el padre.
  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  return (
    <View style={styles.videoPreview}>
      <View style={styles.playerContainer}>
        {/* Mostramos el thumbnail de fondo mientras el video carga para evitar el gris */}
        {thumbnail && (
          <Image
            source={{ uri: thumbnail }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}

        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      </View>

      {/* Controles de mute y borrado */}
      <View style={styles.previewOverlayControls}>
        <TouchableOpacity
          onPress={() => setIsMuted(!isMuted)}
          style={styles.controlIconBadge}
        >
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={20}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onRemove}
        style={styles.removeVideoBtnFloating}
      >
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
        <Text style={styles.removeVideoText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function CreateReel({ onBack, reelId }: CreateReelProps) {
  const { user } = useAuth();
  const router = useRouter();
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
        setDescription(data.descripcion || "");
        setVideoUri(data.video_url);
        setThumbnailUri(data.thumbnail_url || "");
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
      // 1. Subir video al servicio (ahora nos devuelve videoUrl y thumbnailUrl)
      const uploadResult = await uploadVideo(videoUri);

      if (!uploadResult) {
        Alert.alert("Error", "No se pudo subir el video. Intenta de nuevo.");
        return;
      }

      const videoUrl = uploadResult.videoUrl;
      const thumbnailUrl = uploadResult.thumbnailUrl || null;

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
          if (!isEditing) {
            router.replace({
              pathname: "/(tabs)",
              params: { refresh: String(Date.now()) },
            });
          } else {
            onBack();
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error publishing reel:", error);
      Alert.alert("Error", "Hubo un problema al publicar el reel");
    }
  };

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title={isEditing ? "Editar Reel" : "Nuevo Reel"}
        showBackButton
        onBack={onBack}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.label}>Video del Reel</Text>

            {videoUri ? (
              /* CLAVE: Usamos 'key={videoUri}'. 
                 Si el usuario cambia de video, React destruye el componente anterior 
                 y crea uno nuevo, reiniciando el Player de expo-video sin errores de memoria o pantalla gris.
              */
              <VideoPreview
                key={videoUri}
                uri={videoUri}
                thumbnail={thumbnailUri}
                onRemove={() => setVideoUri("")}
              />
            ) : (
              <TouchableOpacity
                onPress={handlePickVideo}
                style={[
                  styles.uploadPlaceholder,
                  errors.video && { borderColor: COLORS.error },
                ]}
              >
                <Ionicons name="videocam" size={48} color={COLORS.textTertiary} />
                <Text style={styles.uploadText}>
                  Presiona para elegir un video
                </Text>
              </TouchableOpacity>
            )}
            {errors.video && <Text style={styles.errorText}>{errors.video}</Text>}
          </View>

          <View style={styles.card}>
            <AppInput
              label="Descripción"
              placeholder="Escribe algo sobre tu video..."
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.publishBtn, uploading && { opacity: 0.7 }]}
          onPress={handlePublish}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.publishText}>
              {isEditing ? "Guardar Cambios" : "Publicar Ahora"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de Progreso */}
      <Modal visible={uploading} transparent>
        <View style={styles.uploadModalOverlay}>
          <View style={styles.uploadModalContent}>
            {Math.min(uploadProgress, 100) >= 100 ? (
              <Ionicons name="checkmark-circle" size={40} color={COLORS.success || "#22C55E"} />
            ) : (
              <ActivityIndicator size="large" color={COLORS.primary} />
            )}
            <Text style={styles.uploadModalTitle}>
              {Math.min(uploadProgress, 100) >= 100
                ? "¡Completado!"
                : "Subiendo Video..."}
            </Text>
            <Text style={styles.uploadModalSubtitle}>
              {Math.min(uploadProgress, 100)}%
            </Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${Math.min(uploadProgress, 100)}%` },
                ]}
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
  uploadPlaceholder: {
    height: 250,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.cardBorder,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
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
  muteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: COLORS.blackTransparent60,
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  videoPreview: {
    height: 350,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailPreview: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  videoInfoContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.blackTransparent60,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  videoText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: "600",
  },
  miniThumbnailContainer: {
    marginBottom: 8,
    alignItems: "center",
  },
  miniThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.whiteTransparent50,
    backgroundColor: COLORS.background,
  },
  removeVideoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
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
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 100,
    paddingBottom: 50
  },
  publishBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  charCounter: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  charCounterText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: "500",
  },
  removeVideoBtnFloating: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  playerContainer: {
    width: "100%",
    height: "100%",
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  playIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
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
  controlBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  previewControls: {
    position: "absolute",
    top: 12,
    right: 12,
    gap: 8,
  },
  previewOverlayControls: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 20,
  },
  controlIconBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 20,
  },
});
