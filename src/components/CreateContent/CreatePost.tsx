/**
 * CreateContent/CreatePost.tsx
 * Formulario para crear posts
 */

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

import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/colors";
import { ScreenWrapper } from "../../screens/ScreenWrapper";
import ReordenableImages from "./ReordenableImages";
import { Post } from "../../types";
import { supabase } from "../../lib/supabase";
import * as Burnt from "burnt";
import { decode } from "base64-arraybuffer";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useCreateContent } from "@/hooks/hooks/useCreateContent";

interface CreatePostProps {
  post?: Post;
  onBack: () => void;
}

export default function CreatePost({ post, onBack }: CreatePostProps) {
  const { user } = useAuth();
  const { createPost, uploading } = useCreateContent(user?.id);

  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  // // const { getPostById } = useGridProfile(); // Removed

  const isEditing = !!post;

  useEffect(() => {
    if (isEditing) {
      loadPostData();
    }
  }, [post]);

  const loadPostData = async () => {
    if (post) {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("id", post.id)
          .single();

        if (error) throw error;

        if (data) {
          setContent(data.contenido); // DB uses 'contenido'
          setImages(data.imagenes || []);
        }
      } catch (err) {
        console.error("Error loading post:", err);
        Alert.alert("Error", "No se pudo cargar el post");
      }
    }
  };

  /**
   * Helper to upload a single image
   */
  const uploadImage = async (uri: string): Promise<string | null> => {
    if (uri.startsWith("http")) return uri; // Already remote

    try {
      const userPath = user?.id ? `${user.id}/` : "anon/";
      const fileName = `post_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.jpg`;
      const filePath = `${userPath}${fileName}`;

      let fileBody;
      if (Platform.OS === "web") {
        const res = await fetch(uri);
        fileBody = await res.blob();
      } else {
        const { readAsStringAsync } = require("expo-file-system/legacy");
        const base64 = await readAsStringAsync(uri, { encoding: "base64" });
        fileBody = decode(base64);
      }

      const { data, error } = await supabase.storage
        .from("feed-images")
        .upload(filePath, fileBody, { contentType: "image/jpeg" });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("feed-images")
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  /**
   * Seleccionar imagen de la galería
   */
  const handlePickImage = async () => {
    // Pedir permisos
    //
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería");
      return;
    }

    // Abrir galería
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      allowsEditing: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5)); // Max 5 imágenes
    }
  };

  /**
   * Remover imagen
   */
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Validar formulario
   */
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!content.trim()) {
      newErrors.content = "El contenido no puede estar vacío";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Publicar post
   */
  const handlePublish = async () => {
    if (!validate()) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }

    try {
      setUploadProgress(10);

      const uploadedImages: string[] = [];
      if (images.length > 0) {
        if (isEditing) {
          for (const img of images) {
            const url = await uploadImage(img);
            if (url) uploadedImages.push(url);
          }
        }
      }

      setUploadProgress(50);

      if (isEditing) {
        // ACTUALIZAR
        const { error } = await supabase
          .from("posts")
          .update({
            contenido: content,
            imagenes: uploadedImages,
            updated_at: new Date(),
          })
          .eq("id", post?.id);

        if (error) throw error;

        Burnt.toast({ title: "Post actualizado!", preset: "done" });
      } else {
        // CREAR
        const success = await createPost(content, images);
        if (!success) throw new Error("Error creando post");
        Burnt.toast({ title: "Post publicado!", preset: "done" });
      }

      setUploadProgress(100);
      setTimeout(() => {
        setContent("");
        setImages([]);
        setUploadProgress(0);
        onBack();
      }, 500);
    } catch (error) {
      console.error("Error publishing:", error);
      Alert.alert("Error", "No se pudo guardar el post");
      setUploadProgress(0);
    }
  };

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? "Editar Post" : "Crear Post"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Contenido */}
        <View style={styles.card}>
          <AppInput
            label="Nueva Publicación *"
            multiline
            placeholder="¿Qué quieres compartir?"
            value={content}
            onChangeText={(text) => {
              setContent(text);
              if (errors.content) {
                setErrors({ ...errors, content: "" });
              }
            }}
            error={errors.content}
            inputStyle={styles.textArea}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Imágenes (opcional)</Text>
          <Text style={styles.hint}>Máximo 5 imágenes</Text>

          <View style={{ marginTop: 9 }}>
            {images.length > 0 && (
              <GestureHandlerRootView>
                <ReordenableImages
                  images={images}
                  onReorder={setImages}
                  onRemove={handleRemoveImage}
                />
              </GestureHandlerRootView>
            )}

            {images.length < 5 && (
              <View style={{ marginTop: 12 }}>
                <TouchableOpacity
                  onPress={handlePickImage}
                  style={[
                    styles.uploadBtn,
                    errors.images && styles.uploadBtnError,
                    { width: "100%", flexDirection: "row", gap: 8, height: 50 },
                  ]}
                >
                  <Ionicons
                    name="camera"
                    size={28}
                    color={COLORS.textTertiary}
                  />
                  <Text style={styles.uploadText}>Agregar foto</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
                {isEditing ? "Actualizar Post" : "Publicar Post"}
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
            <Text style={styles.uploadModalTitle}>Subiendo post...</Text>
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
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  textArea: {
    height: 150,
    textAlignVertical: "top",
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
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  imageBox: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: COLORS.error,
    padding: 4,
    borderRadius: 12,
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingBottom: 60,
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
  uploadBtnError: {
    borderColor: COLORS.error,
  },
});
