/**
 * useCreateContent.ts
 * Hook para crear posts, reels y propiedades en Supabase
 */

import { useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../../lib/supabase";
import { useImageUpload } from "./useImageUpload";
import * as Burnt from "burnt";

export function useCreateContent(userId?: string) {
  const {
    uploadImage,
    uploadImages,
    uploading: isUploadingImage,
  } = useImageUpload();
  const [isCreatingInDB, setIsCreatingInDB] = useState(false);

  const uploading = isUploadingImage || isCreatingInDB;

  /**
   * Crear POST
   */
  const createPost = async (
    content: string,
    images: string[],
    type: "post" | "busqueda" | "openhouse" | "aniversario" | "sold" = "post",
  ) => {
    if (!userId) {
      Alert.alert("Error", "Debes iniciar sesión");
      return false;
    }

    setIsCreatingInDB(true);

    try {
      // 1. Subir imágenes a Supabase Storage
      const uploadedUrls = await uploadImages(images, "feed-images", "posts");

      // 2. Crear post en BD con URLs de Supabase
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          publicado_por: userId,
          contenido: content,
          tipo: type, // Agregado tipo
          imagenes: uploadedUrls.length > 0 ? uploadedUrls : null,
        })
        .select()
        .single();

      if (postError) throw postError;

      // 3. Crear feed_item
      const { error: feedError } = await supabase.from("feed_items").insert({
        tipo_contenido: "post",
        contenido_id: post.id,
        publicado_por: userId,
        visibilidad: "publico",
        estado_moderacion: "activo",
      });

      if (feedError) throw feedError;

      Burnt.toast({
        title: "Post publicado correctamente!",
        preset: "done",
        duration: 2500,
      });

      return true;
    } catch (error: any) {
      console.error("Error creating post:", error);
      Burnt.toast({
        title: "Error al publicar el post",
        preset: "error",
      });
      return false;
    } finally {
      setIsCreatingInDB(false);
    }
  };

  /**
   * Crear REEL
   */
  const createReel = async (
    description: string,
    videoUrl: string,
    thumbnailUrl?: string | null,
  ) => {
    if (!userId) {
      Alert.alert("Error", "Debes iniciar sesión");
      return false;
    }

    setIsCreatingInDB(true);

    try {
      // 1. Subir video a Supabase Storage (si es local)
      let uploadedVideoUrl = videoUrl;

      if (videoUrl && !videoUrl.startsWith("http")) {
        const videoUploadUrl = await uploadImage(
          videoUrl,
          "feed-images",
          "reels",
        );
        if (videoUploadUrl) {
          uploadedVideoUrl = videoUploadUrl;
        }
      }

      // 2. Crear reel en BD con thumbnail
      const { data: reel, error: reelError } = await supabase
        .from("reels")
        .insert({
          publicado_por: userId,
          descripcion: description,
          video_url: uploadedVideoUrl,
          thumbnail_url: thumbnailUrl || null,
        })
        .select()
        .single();

      if (reelError) throw reelError;

      // 3. Crear feed_item
      const { error: feedError } = await supabase.from("feed_items").insert({
        tipo_contenido: "reel",
        contenido_id: reel.id,
        publicado_por: userId,
        visibilidad: "publico",
        estado_moderacion: "activo",
      });

      if (feedError) throw feedError;

      Burnt.toast({
        title: "Publicado exitosamente!",
        preset: "done",
      });
      return true;
    } catch (error: any) {
      console.error("Error creating reel:", error);
      Burnt.toast({
        title: "Error al publicar el reel",
        preset: "error",
      });
      return false;
    } finally {
      setIsCreatingInDB(false);
    }
  };

  /**
   * Actualizar REEL
   */
  const updateReel = async (
    reelId: string,
    description: string,
    videoUrl: string,
    thumbnailUrl?: string | null,
  ) => {
    if (!userId) {
      Alert.alert("Error", "Debes iniciar sesión");
      return false;
    }

    setIsCreatingInDB(true);

    try {
      // 1. Subir video a Supabase Storage (si es local)
      // Nota: la lógica de "si es local" ya se maneja fuera o en uploadVideo,
      // pero si el hook useVideoUpload ya lo maneja, perfecto.
      // Aquí asumimos que videoUrl ya es la URL final o que se procesará antes.
      // Pero para mantener consistencia con createReel, podríamos repetir la lógica o asumir que se pasa la URL final.
      // Dado que el componente CreateReel pasará la URL final, aquí solo hacemos el update.
      // Sin embargo, createReel hacía la subida adentro si no era http.
      // Vamos a asumir que el componente se encarga de llamar a uploadVideo y nos pasa la URL final aquí para simplificar,
      // O podemos duplicar la lógica de uploadVideo si queremos encapsularlo, pero CreateReel ya llama a uploadVideo.
      // REVISIÓN: CreateReel llama a uploadVideo ANTES de createReel.
      // En createReel (arriba) también hay una lógica redundante de uploadImage, pero CreateReel.tsx ya llama a uploadVideo.
      // Está bien, solo actualizamos la BD.

      // 2. Actualizar reel en BD
      const updateData: any = {
        descripcion: description,
        video_url: videoUrl,
        updated_at: new Date().toISOString(),
      };

      if (thumbnailUrl) {
        updateData.thumbnail_url = thumbnailUrl;
      }

      const { error: reelError } = await supabase
        .from("reels")
        .update(updateData)
        .eq("id", reelId)
        .eq("publicado_por", userId); // Seguridad adicional

      if (reelError) throw reelError;

      Burnt.toast({
        title: "Reel actualizado!",
        preset: "done",
      });
      return true;
    } catch (error: any) {
      console.error("Error updating reel:", error);
      Burnt.toast({
        title: "Error al actualizar",
        preset: "error",
      });
      return false;
    } finally {
      setIsCreatingInDB(false);
    }
  };

  /**
   * Crear PROPIEDAD
   */
  const createProperty = async (propertyData: {
    title: string;
    description: string;
    type: string;
    subtype: string;
    operation: "venta" | "renta";
    price: number;
    currency: "MXN" | "USD";
    city: string;
    municipality: string;
    colony: string;
    street: string;
    number: string;
    interior?: string;
    images: string[];
    beds?: number;
    baths?: number;
    parking?: number;
    constructionSqft?: number;
    landSqft?: number;
    amenities?: string[];
    coordinates?: { lat: number; lng: number };
  }) => {
    if (!userId) {
      Alert.alert("Error", "Debes iniciar sesión");
      return false;
    }

    setIsCreatingInDB(true);

    try {
      // 1. Crear propiedad
      const { data: property, error: propertyError } = await supabase
        .from("propiedades")
        .insert({
          tipo: propertyData.type,
          subtipo: propertyData.subtype,
          descripcion: propertyData.description,
          ciudad: propertyData.city,
          municipio: propertyData.municipality,
          colonia: propertyData.colony,
          calle: propertyData.street,
          numero_exterior: propertyData.number,
          numero_interior: propertyData.interior,
          fotos: propertyData.images,
          habitaciones: propertyData.beds,
          banos: propertyData.baths,
          estacionamientos: propertyData.parking,
          metros_cuadrados_construccion: propertyData.constructionSqft,
          metros_cuadrados_terreno: propertyData.landSqft,
        })
        .select()
        .single();

      if (propertyError) throw propertyError;

      // 2. Crear operación (venta/renta)
      const { error: operationError } = await supabase
        .from("operaciones_propiedad")
        .insert({
          propiedad_id: property.id,
          tipo_operacion: propertyData.operation,
          precio: propertyData.price,
          moneda: propertyData.currency,
        });

      if (operationError) throw operationError;

      // 3. Crear feed_item
      const { error: feedError } = await supabase.from("feed_items").insert({
        tipo_contenido: "propiedad",
        contenido_id: property.id,
        publicado_por: userId,
        visibilidad: "publico",
        estado_moderacion: "activo",
      });

      if (feedError) throw feedError;

      Burnt.toast({
        title: "Propiedad publicada exitosamente!",
        preset: "done",
      });
      return true;
    } catch (error: any) {
      console.error("Error creating property:", error);
      Alert.alert("Error", error.message || "No se pudo publicar la propiedad");
      return false;
    } finally {
      setIsCreatingInDB(false);
    }
  };

  return {
    createPost,
    createReel,
    updateReel,
    createProperty,
    uploading,
  };
}
