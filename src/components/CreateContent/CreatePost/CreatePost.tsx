/**
 * CreateContent/CreatePost.tsx
 * Formulario para crear posts
 */

import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "@/design-system/components/AppInput";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/context/AuthContext";
import { useModal } from "@/context/ModalContext";
import { useToast } from "@/context/ToastContext";
import { COLORS } from "@/constants/colors";
import { ScreenWrapper } from "@/screens/ScreenWrapper";
import ReordenableImages from "../ReordenableImages";
import { Post } from "@/types";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Burnt from "burnt";
import { supabase } from "@/lib/supabase";
import { useCreateContent } from "@/hooks/useCreateContent";
import { uploadImage as uploadImageService } from "@/services/uploadService";
import { AppHeader } from "@/components/AppHeader";
import { OpenHousePost } from "./OpenHousePost";
import { BusquedaPost } from "./BusquedaPost";
import { logger } from "@/utils/logger";

const log = logger.scoped("CreatePost");

const formatNumericInput = (num: number | string): string => {
  const raw = String(num).replace(/,/g, "");
  if (!raw || isNaN(Number(raw))) return "";
  const parts = raw.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

const parseNum = (val: string): number | null => {
  if (!val || !val.trim()) return null;
  const n = parseFloat(val.replace(/,/g, ""));
  return isNaN(n) ? null : n;
};

interface CreatePostProps {
  post?: Post;
  onBack: () => void;
}

export default function CreatePost({ post, onBack }: CreatePostProps) {
  const { user } = useAuth();
  const { showModal } = useModal();
  const { showToast } = useToast();
  const router = useRouter();
  const { createPost, uploading: creatingPost } = useCreateContent(user?.id);

  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState(0);

  // Campos específicos de edición
  const [fechaHora, setFechaHora] = useState<Date>(new Date());

  const [fechaFinalizacion, setFechaFinalizacion] = useState<Date | null>(null);
  const [fotoPropiedad, setFotoPropiedad] = useState<string | null>(null);
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");
  const [habitaciones, setHabitaciones] = useState("");
  const [operacion, setOperacion] = useState("");
  const [subtipo, setSubtipo] = useState<string[]>([]);
  const [tipoPropiedad, setTipoPropiedad] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [statusPost, setStatusPost] = useState("Visible");

  // Campos extra para post de búsqueda
  const [moneda, setMoneda] = useState("MXN");
  const [banos, setBanos] = useState("");
  const [estacionamientos, setEstacionamientos] = useState("");
  const [niveles, setNiveles] = useState("");
  const [antiguedad, setAntiguedad] = useState("");
  const [m2Terreno, setM2Terreno] = useState("");
  const [m2Construccion, setM2Construccion] = useState("");
  const [busquedaLocation, setBusquedaLocation] = useState<{
    estado: string;
    ciudad: string;
    municipio: string;
    colonia: string;
    colonias?: string[];
    latitud?: number;
    longitud?: number;
  } | null>(null);
  const [nota, setNota] = useState("");

  const isEditing = !!post;
  const [isUploadingManual, setIsUploadingManual] = useState(false);
  const uploading = creatingPost || isUploadingManual;

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
          setContent(data.contenido);
          setUbicacion(data.ubicacion);
          setImages(data.imagenes || []);
          if (data.status) {
            setStatusPost(data.status.charAt(0).toUpperCase() + data.status.slice(1));
          }

          if (data.tipo === "openhouse") {
            if (data.fecha_hora) setFechaHora(new Date(data.fecha_hora));
            if (data.fecha_finalizacion)
              setFechaFinalizacion(new Date(data.fecha_finalizacion));
            if (data.foto_propiedad) setFotoPropiedad(data.foto_propiedad);
          }

          if (data.tipo === "busqueda" && data.busquedas_json) {
            const filtros = data.busquedas_json.filtros || {};
            const caracteristicas = filtros.caracteristicas || {};
            const superficies = filtros.superficies || {};
            const ub = filtros.ubicacion || {};

            setPrecioMin(
              typeof filtros.precio_min === "number" && filtros.precio_min > 0
                ? formatNumericInput(filtros.precio_min)
                : "",
            );
            setPrecioMax(
              typeof filtros.precio_max === "number" && filtros.precio_max > 0
                ? formatNumericInput(filtros.precio_max)
                : "",
            );
            setHabitaciones(
              caracteristicas.habitaciones?.toString() || "",
            );
            setBanos(caracteristicas.banos?.toString() || "");
            setEstacionamientos(
              caracteristicas.estacionamientos?.toString() || "",
            );
            setNiveles(caracteristicas.niveles?.toString() || "");
            setAntiguedad(
              caracteristicas.antiguedad ? String(caracteristicas.antiguedad) : "",
            );
            setM2Terreno(
              typeof superficies.m2_terreno_min === "number" && superficies.m2_terreno_min > 0
                ? String(superficies.m2_terreno_min)
                : "",
            );
            setM2Construccion(
              typeof superficies.m2_construccion_min === "number" && superficies.m2_construccion_min > 0
                ? String(superficies.m2_construccion_min)
                : "",
            );
            setMoneda(filtros.moneda || "MXN");
            setNota(typeof filtros.nota === "string" ? filtros.nota : "");
            setOperacion(filtros.operacion || "");
            setTipoPropiedad(filtros.tipo_propiedad || "");
            const rawSubtipo = filtros.subtipo;
            setSubtipo(Array.isArray(rawSubtipo) ? rawSubtipo : rawSubtipo ? [rawSubtipo] : []);

            const incomingColonias: string[] = Array.isArray(ub.colonias)
              ? ub.colonias.filter((c: unknown) => typeof c === "string" && (c as string).trim())
              : typeof ub.colonia === "string" && ub.colonia.trim()
                ? [ub.colonia]
                : [];
            setBusquedaLocation({
              estado: ub.estado ?? "",
              ciudad: ub.ciudad ?? "",
              municipio: ub.municipio ?? "",
              colonia: incomingColonias[0] ?? "",
              colonias: incomingColonias,
              latitud: ub.latitud,
              longitud: ub.longitud,
            });
          }
        }
      } catch (err) {
        log.error("Error loading post:", err);
        showToast("No se pudo cargar el post", "error");
      }
    }
  };

  /**
   * Seleccionar imagen de la galería
   */
  const handlePickImage = async (limit: number = 5) => {
    // Pedir permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showModal({ title: "Permiso denegado", message: "Necesitamos acceso a tu galería", confirmText: "OK" });
      return;
    }

    // Abrir galería
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: limit > 1,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => {
        if (limit === 1) return uris;
        return [...prev, ...uris].slice(0, limit);
      });
      setErrors((prev) => ({ ...prev, images: "" }));
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
      showModal({ title: "Error", message: "Por favor completa todos los campos", confirmText: "OK" });
      return;
    }

    try {
      setIsUploadingManual(true);
      setUploadProgress(10);

      const uploadedImages: string[] = [];
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          if (img.startsWith("http")) {
            uploadedImages.push(img);
          } else {
            const url = await uploadImageService(img, "posts");
            if (url) uploadedImages.push(url);
          }
          setUploadProgress(10 + ((i + 1) / images.length) * 40);
        }
      }

      setUploadProgress(50);

      if (isEditing) {
        // ACTUALIZAR
        let updatedData: any = {
          contenido: content,
          imagenes: uploadedImages.length > 0 ? uploadedImages : null,
          status: statusPost.toLowerCase(),
          updated_at: new Date(),
        };

        if (post?.tipo === "openhouse") {
          updatedData.fecha_hora = fechaHora.toISOString();
          updatedData.fecha_finalizacion = fechaFinalizacion?.toISOString();
          updatedData.foto_propiedad = fotoPropiedad;
          updatedData.ubicacion = ubicacion;
        }

        if (post?.tipo === "busqueda") {
          const currentJson = post.busquedas_json || {};
          const currentFiltros = currentJson.filtros || {};
          const currentCaracteristicas = currentFiltros.caracteristicas || {};
          const currentSuperficies = currentFiltros.superficies || {};
          const currentUbicacion = currentFiltros.ubicacion || {};

          const loc = busquedaLocation ?? currentUbicacion;
          const coloniasArr: string[] = Array.isArray(loc.colonias)
            ? loc.colonias
            : loc.colonia
              ? [loc.colonia]
              : [];

          const minParsed = parseNum(precioMin);
          const maxParsed = parseNum(precioMax);
          const habitacionesParsed = parseNum(habitaciones);
          const banosParsed = parseNum(banos);
          const estacionamientosParsed = parseNum(estacionamientos);
          const nivelesParsed = parseNum(niveles);
          const m2TerrenoParsed = parseNum(m2Terreno);
          const m2ConstruccionParsed = parseNum(m2Construccion);

          updatedData.busquedas_json = {
            ...currentJson,
            filtros: {
              ...currentFiltros,
              operacion: operacion || currentFiltros.operacion,
              tipo_propiedad: tipoPropiedad || currentFiltros.tipo_propiedad,
              subtipo: subtipo.length > 0 ? subtipo : currentFiltros.subtipo,
              moneda: moneda || currentFiltros.moneda,
              precio_min: minParsed !== null ? minParsed : currentFiltros.precio_min,
              precio_max: maxParsed !== null ? maxParsed : currentFiltros.precio_max,
              ubicacion: {
                ...currentUbicacion,
                estado: loc.estado ?? currentUbicacion.estado ?? "",
                ciudad: loc.ciudad ?? currentUbicacion.ciudad ?? "",
                municipio: loc.municipio ?? currentUbicacion.municipio ?? "",
                colonia: coloniasArr[0] ?? "",
                colonias: coloniasArr,
                icon: currentUbicacion.icon || "location-outline",
              },
              caracteristicas: {
                ...currentCaracteristicas,
                habitaciones:
                  habitacionesParsed !== null
                    ? habitacionesParsed
                    : currentCaracteristicas.habitaciones,
                banos:
                  banosParsed !== null
                    ? banosParsed
                    : currentCaracteristicas.banos,
                estacionamientos:
                  estacionamientosParsed !== null
                    ? estacionamientosParsed
                    : currentCaracteristicas.estacionamientos,
                niveles:
                  nivelesParsed !== null
                    ? nivelesParsed
                    : currentCaracteristicas.niveles,
                antiguedad: antiguedad || currentCaracteristicas.antiguedad,
              },
              superficies: {
                ...currentSuperficies,
                m2_terreno_min:
                  m2TerrenoParsed !== null
                    ? m2TerrenoParsed
                    : currentSuperficies.m2_terreno_min,
                m2_construccion_min:
                  m2ConstruccionParsed !== null
                    ? m2ConstruccionParsed
                    : currentSuperficies.m2_construccion_min,
                icon: currentSuperficies.icon || "resize-outline",
              },
              nota: nota.trim(),
            },
          };
        }

        const { error } = await supabase
          .from("posts")
          .update(updatedData)
          .eq("id", post?.id);

        if (error) throw error;

        Burnt.toast({ title: "Post actualizado!", preset: "done" });
      } else {
        // CREAR
        const success = await createPost(content, uploadedImages, "post", null, statusPost);
        if (!success) throw new Error("Error creando post");
        Burnt.toast({ title: "Post publicado!", preset: "done" });
      }

      setUploadProgress(100);
      setTimeout(() => {
        setContent("");
        setImages([]);
        setUploadProgress(0);
        setIsUploadingManual(false);
        if (!isEditing) {
          router.replace({
            pathname: "/(tabs)",
            params: { refresh: String(Date.now()) },
          });
        } else if (post?.tipo === "busqueda") {
          onBack();
          router.replace({
            pathname: "/(tabs)",
            params: { refresh: String(Date.now()) },
          });
        } else {
          onBack();
        }
      }, 500);
    } catch (error) {
      log.error("Error publishing:", error);
      showToast("No se pudo guardar el post", "error");
      setUploadProgress(0);
      setIsUploadingManual(false);
    }
  };

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      {/* Header */}
      <AppHeader
        title={isEditing ? "Editar Post" : "Crear Post"}
        showBackButton={true}
        onBack={onBack}
      />

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
              if (text.length <= 2500) {
                setContent(text);
              } else {
                setContent(text.substring(0, 2500));
              }

              if (errors.content) {
                setErrors({ ...errors, content: "" });
              }
            }}
            error={errors.content}
            inputStyle={styles.textArea}
            numberOfLines={10}
            maxLength={2500}
            helperText={`${content.length}/2500`}
          />
        </View>

        {isEditing && post?.tipo === "openhouse" && (
          <OpenHousePost
            post={post}
            errors={errors}
            fechaHora={fechaHora}
            setFechaHora={setFechaHora}
            fechaFinalizacion={fechaFinalizacion}
            setFechaFinalizacion={setFechaFinalizacion}
            fotoPropiedad={fotoPropiedad}
            setFotoPropiedad={setFotoPropiedad}
            ubicacion={ubicacion}
            setUbicacion={setUbicacion}
            statusPost={statusPost}
            setStatusPost={setStatusPost}
          />
        )}

        {isEditing && post?.tipo === "busqueda" && (
          <BusquedaPost
            post={post}
            precioMin={precioMin}
            setPrecioMin={setPrecioMin}
            precioMax={precioMax}
            setPrecioMax={setPrecioMax}
            habitaciones={habitaciones}
            setHabitaciones={setHabitaciones}
            operacion={operacion}
            setOperacion={setOperacion}
            subtipo={subtipo}
            setSubtipo={setSubtipo}
            tipoPropiedad={tipoPropiedad}
            setTipoPropiedad={setTipoPropiedad}
            moneda={moneda}
            setMoneda={setMoneda}
            banos={banos}
            setBanos={setBanos}
            estacionamientos={estacionamientos}
            setEstacionamientos={setEstacionamientos}
            niveles={niveles}
            setNiveles={setNiveles}
            antiguedad={antiguedad}
            setAntiguedad={setAntiguedad}
            m2Terreno={m2Terreno}
            setM2Terreno={setM2Terreno}
            m2Construccion={m2Construccion}
            setM2Construccion={setM2Construccion}
            locationData={busquedaLocation}
            setLocationData={setBusquedaLocation}
            nota={nota}
            setNota={setNota}
          />
        )}

        {post?.tipo !== "busqueda" &&
          post?.tipo !== "aniversario" &&
          post?.tipo !== "openhouse" && (
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
                      onPress={() => handlePickImage()}
                      style={[
                        styles.uploadBtn,
                        errors.images && styles.uploadBtnError,
                        {
                          width: "100%",
                          flexDirection: "row",
                          gap: 8,
                          height: 50,
                        },
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
          )}
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
    color: COLORS.textPrimary,
    fontWeight: "500",
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
