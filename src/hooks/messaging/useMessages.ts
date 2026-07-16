/**
 * useMessages.ts - REFACTORIZADO
 * Hook para gestionar mensajes con paginación y Realtime
 *
 * FIXES:
 * - Suscripción Realtime con limpieza correcta
 * - Sin dependencias circulares
 * - Prevención de loops infinitos
 * - Mejor manejo de conversaciones nuevas
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Image as RNImage, Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

/** Ancho máximo de una foto enviada por chat. Ver `compressImage`. */
const MAX_IMAGE_WIDTH = 1600;

const log = logger.scoped("useMessages");
import { useModal } from "@/context/ModalContext";

interface Message {
  id: string;
  conversacion_id: string;
  emisor_id: string;
  contenido: string | null;
  tipo: "texto" | "imagen" | "archivo" | "propiedad";
  imagen_url: string | null;
  archivo_url: string | null;
  archivo_nombre: string | null;
  propiedad_id: string | null;
  leido: boolean;
  fecha_leido: string | null;
  created_at: string;
  propiedad?: {
    id: string;
    tipo: string;
    subtipo: string;
    descripcion: string;
    fotos: string[];
    ciudad: string;
    operaciones?: Array<{
      tipo_operacion: string;
      precio: number;
      moneda: string;
    }>;
  };
}

const PAGE_SIZE = 20;

export function useMessages(conversationId: string | null, userId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const { showModal } = useModal();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Refs para evitar recreación de suscripciones
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Cargar mensajes
   */
  const loadMessages = async (pageNum: number = 0, append: boolean = false) => {
    if (!conversationId) return;

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("mensajes")
        .select("*")
        .eq("conversacion_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (fetchError) throw fetchError;

      const newMessages = (data || []).reverse();

      if (!isMountedRef.current) return;

      if (append) {
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }

      setHasMore(newMessages.length === PAGE_SIZE);
      setError(null);
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  /**
   * Comprimir una foto antes de subirla al chat.
   *
   * La cámara del teléfono entrega originales de 2-4 MB (y en iPhone, HEIC, que
   * Android ni siquiera sabe pintar). A ese peso la burbuja tardaba una eternidad
   * o se quedaba en gris para siempre. 1600px de ancho con calidad 0.7 deja
   * ~200-400 KB y salida JPEG garantizada.
   *
   * Solo aplica a fotos: los videos van por la misma carpeta `images` y el
   * manipulador no los toca. Si la compresión falla, se sube el original.
   */
  const compressImage = async (fileUri: string): Promise<string> => {
    if (/\.(mp4|mov|avi|mkv|m4v|webm)(\?|#|$)/i.test(fileUri)) return fileUri;

    try {
      // Solo se reescala si excede el ancho objetivo; sin esto, `resize` también
      // AMPLÍA las imágenes pequeñas y acaban pesando más que el original.
      const width = await new Promise<number>((resolve) =>
        RNImage.getSize(
          fileUri,
          (w) => resolve(w),
          () => resolve(0),
        ),
      );
      const actions =
        width > MAX_IMAGE_WIDTH ? [{ resize: { width: MAX_IMAGE_WIDTH } }] : [];

      const result = await ImageManipulator.manipulateAsync(fileUri, actions, {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return result.uri;
    } catch (err) {
      log.warn("No se pudo comprimir la imagen, se sube el original:", err);
      return fileUri;
    }
  };

  /**
   * Subir archivo a Supabase Storage
   */
  const uploadFile = async (
    fileUri: string,
    folder: "images" | "files",
  ): Promise<string | null> => {
    try {
      let fileContent: string | Blob | ArrayBuffer;
      let contentType: string | undefined;
      let uploadPath: string;

      if (folder === "images") {
        fileUri = await compressImage(fileUri);
      }

      if (Platform.OS === "web") {
        const response = await fetch(fileUri);
        fileContent = await response.blob();
        contentType = fileContent.type || "image/jpeg";
        const fileName = `${folder}_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}`;
        uploadPath = `conversaciones/${folder}/${fileName}`;
      } else {
        const response = await fetch(fileUri);
        const buffer = await response.arrayBuffer();
        fileContent = buffer as any;

        const match =
          fileUri.match(/\.([0-9a-z]+)(?=[?#])?$/i) ||
          fileUri.match(/\.([0-9a-z]+)$/i);
        const extension = match ? match[1].toLowerCase() : "jpeg";

        if (response.headers.get("content-type")) {
          contentType = response.headers.get("content-type") || undefined;
        }

        if (!contentType || contentType === "application/octet-stream") {
          contentType =
            folder === "images"
              ? `image/${extension}`
              : `application/${extension}`;
        }

        const fileName = `${folder}_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}.${extension}`;

        uploadPath = `conversaciones/${folder}/${fileName}`;
      }

      // Check File Size Limits
      const sizeInBytes =
        Platform.OS === "web"
          ? (fileContent as Blob).size
          : (fileContent as ArrayBuffer).byteLength;

      const isVideo =
        contentType?.startsWith("video/") ||
        fileUri.match(/\.(mp4|mov|avi|mkv)$/i);
      const isImage =
        contentType?.startsWith("image/") ||
        fileUri.match(/\.(jpg|jpeg|png|gif|webp)$/i);

      let limit = 20 * 1024 * 1024; // Default: 20MB (Files)
      let typeLabel = "archivo";

      if (isVideo) {
        limit = 40 * 1024 * 1024; // 40MB
        typeLabel = "video";
      } else if (isImage) {
        limit = 5 * 1024 * 1024; // 5MB
        typeLabel = "imagen";
      }

      if (sizeInBytes > limit) {
        throw new Error(
          `El ${typeLabel} excede el límite permitido de ${limit / (1024 * 1024)}MB.`,
        );
      }

      const { error } = await supabase.storage
        .from("fotos")
        .upload(uploadPath, fileContent, {
          contentType: contentType,
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("fotos")
        .getPublicUrl(uploadPath);

      return urlData.publicUrl;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Helper: Obtener o crear conversación
   */
  const getOrCreateConversation = async (metadata: {
    destinatario_id: string;
    propiedad_id: string | null;
  }): Promise<string | null> => {
    if (conversationId && conversationId !== "new") return conversationId;
    if (!userId) return null;

    try {
      // 1. Buscar si ya existe
      let query = supabase
        .from("conversaciones")
        .select("id")
        .or(
          `and(usuario1_id.eq.${userId},usuario2_id.eq.${metadata.destinatario_id}),and(usuario1_id.eq.${metadata.destinatario_id},usuario2_id.eq.${userId})`,
        );

      if (metadata.propiedad_id) {
        query = query.eq("propiedad_id", metadata.propiedad_id);
      } else {
        query = query.is("propiedad_id", null);
      }

      const { data: existing } = await query.maybeSingle();

      if (existing) {
        return existing.id;
      }

      // 2. Crear nueva si no existe
      // Intentamos ordenar los IDs por si el trigger de agrupaciones (Source of Truth) lo requiere
      const [u1, u2] = [userId, metadata.destinatario_id].sort();

      const { data: newConv, error: createError } = await supabase
        .from("conversaciones")
        .insert({
          usuario1_id: u1,
          usuario2_id: u2,
          propiedad_id: metadata.propiedad_id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Forzar refresh inmediato de las listas de conversaciones de ambos usuarios,
      // sin esperar al debounce de realtime ni al trigger de agrupaciones.
      queryClient.invalidateQueries({
        queryKey: ["conversations", userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["conversations", metadata.destinatario_id],
      });

      return newConv.id;
    } catch (err: any) {
      log.error("Error ensuring conversation exists:", err);
      // Si falla por unique constraint race condition, intentar buscar de nuevo
      if (err.code === "23505") {
        // Unique violation
        // Retry logic could go here, for now return null/throw
      }
      return null;
    }
  };

  /**
   * Enviar mensaje de texto (Optimistic UI)
   */
  const sendMessage = async (
    text: string,
    metadata?: { destinatario_id: string; propiedad_id: string | null },
    imageUri?: string,
  ) => {
    if (!userId || (!text.trim() && !imageUri)) {
      return false;
    }

    // 1. Validar/Obtener conversación ID
    if (!conversationId && !metadata) {
      log.error("Missing metadata for new conversation message");
      return false;
    }

    setSending(true);
    const tempId = `temp-${Date.now()}`;

    try {
      // Asegurar ID de conversación
      let finalConversationId = conversationId;
      if (!finalConversationId || finalConversationId === "new") {
        if (!metadata) throw new Error("Metadata requerida para nuevo chat");
        finalConversationId = await getOrCreateConversation(metadata);
        if (!finalConversationId) throw new Error("No se pudo crear el chat");
      }

      // 2. Crear mensaje temporal y añadirlo al estado (Optimistic)
      const tempMessage: Message = {
        id: tempId,
        conversacion_id: finalConversationId,
        emisor_id: userId,
        contenido: text.trim() || (imageUri ? "📷 Imagen" : ""),
        tipo: imageUri ? "imagen" : "texto",
        leido: false,
        fecha_leido: null,
        created_at: new Date().toISOString(),
        imagen_url: imageUri || null,
        archivo_url: null,
        archivo_nombre: null,
        propiedad_id: null,
      };

      if (isMountedRef.current) {
        setMessages((prev) => [...prev, tempMessage]);
      }

      let uploadedUrl: string | null = null;
      if (imageUri) {
        uploadedUrl = await uploadFile(imageUri, "images");
        if (!uploadedUrl) throw new Error("Failed to upload image");
      }

      // 3. Insertar en Supabase
      const messageData: any = {
        conversacion_id: finalConversationId,
        emisor_id: userId,
        contenido: text.trim() || (imageUri ? "📷 Imagen" : ""),
        tipo: imageUri ? "imagen" : "texto",
        imagen_url: uploadedUrl || null,
      };

      if (metadata) {
        messageData.metadata = metadata;
      }

      const { data, error } = await supabase
        .from("mensajes")
        .insert(messageData)
        .select();

      if (error) throw error;

      // 4. Confirmar éxito
      // Si el mensaje real ya llegó por Realtime (tiene data[0].id),
      // solo removemos el temporal. Si no, reemplazamos el temporal con el real.
      if (data && data.length > 0 && isMountedRef.current) {
        const newMessage = data[0];
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.id);
          // Filtramos el tempId y añadimos el real si no existía
          const filtered = prev.filter((msg) => msg.id !== tempId);
          return exists ? filtered : [...filtered, newMessage];
        });
      }

      // Actualizar vista previa de conversación
      if (finalConversationId) {
        await supabase
          .from("conversaciones")
          .update({
            ultimo_mensaje_preview:
              text.trim().substring(0, 100) || "📷 Imagen",
            ultimo_mensaje_en: new Date().toISOString(),
          })
          .eq("id", finalConversationId);
      }

      return data?.[0] || true;
    } catch (err: any) {
      log.error("Error sending message:", err);
      // Revertir optimistic update
      if (isMountedRef.current) {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        // Mostrar alerta
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        // Mostrar alerta
        showModal({
          title: "Error",
          message: "No se pudo enviar el mensaje.",
          confirmText: "OK",
        });
        setError(err.message);
      }
      return false;
    } finally {
      if (isMountedRef.current) setSending(false);
    }
  };

  /**
   * Enviar imagen (Optimistic UI)
   */
  const sendImage = async (
    imageUri: string,
    metadata?: { destinatario_id: string; propiedad_id: string | null },
  ) => {
    if (!userId) return false;

    setSending(true);
    const tempId = `temp-${Date.now()}`;

    try {
      let finalConversationId = conversationId;
      if (!finalConversationId || finalConversationId === "new") {
        if (!metadata) throw new Error("Metadata requerida para nuevo chat");
        finalConversationId = await getOrCreateConversation(metadata);
        if (!finalConversationId) throw new Error("No se pudo crear el chat");
      }

      // 2. Optimistic Update (mostrando imagen local)
      const tempMessage: Message = {
        id: tempId,
        conversacion_id: finalConversationId,
        emisor_id: userId,
        contenido: "📷 Imagen",
        tipo: "imagen",
        leido: false,
        fecha_leido: null,
        created_at: new Date().toISOString(),
        imagen_url: imageUri, // Usamos URI local
        archivo_url: null,
        archivo_nombre: null,
        propiedad_id: null,
      };

      if (isMountedRef.current) {
        setMessages((prev) => [...prev, tempMessage]);
      }

      // 3. Subir imagen
      const uploadedUrl = await uploadFile(imageUri, "images");
      if (!uploadedUrl) throw new Error("Failed to upload image");

      // 4. Insertar mensaje
      const messageData: any = {
        conversacion_id: finalConversationId,
        emisor_id: userId,
        tipo: "imagen",
        imagen_url: uploadedUrl,
        contenido: "📷 Imagen",
      };

      if (metadata) {
        messageData.metadata = metadata;
      }

      const { data, error } = await supabase
        .from("mensajes")
        .insert(messageData)
        .select();

      if (error) throw error;

      // 5. Confirmar éxito (reemplazar temp por real)
      if (data && data.length > 0 && isMountedRef.current) {
        const newMessage = data[0];
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.id);
          const filtered = prev.filter((msg) => msg.id !== tempId);
          return exists ? filtered : [...filtered, newMessage];
        });
      }

      if (finalConversationId) {
        await supabase
          .from("conversaciones")
          .update({
            ultimo_mensaje_preview: "📷 Imagen",
            ultimo_mensaje_en: new Date().toISOString(),
          })
          .eq("id", finalConversationId);
      }

      return true;
    } catch (err: any) {
      log.error("Error sending image:", err);
      if (isMountedRef.current) {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        showModal({
          title: "Error",
          message: "No se pudo enviar la imagen.",
          confirmText: "OK",
        });
        setError(err.message);
      }
      return false;
    } finally {
      if (isMountedRef.current) setSending(false);
    }
  };

  /**
   * Enviar archivo (Optimistic UI)
   */
  const sendFile = async (
    fileUri: string,
    fileName: string,
    metadata?: { destinatario_id: string; propiedad_id: string | null },
  ) => {
    if (!userId) return false;

    setSending(true);
    const tempId = `temp-${Date.now()}`;

    try {
      let finalConversationId = conversationId;
      if (!finalConversationId || finalConversationId === "new") {
        if (!metadata) throw new Error("Metadata requerida para nuevo chat");
        finalConversationId = await getOrCreateConversation(metadata);
        if (!finalConversationId) throw new Error("No se pudo crear el chat");
      }

      // 2. Optimistic Update
      const tempMessage: Message = {
        id: tempId,
        conversacion_id: finalConversationId,
        emisor_id: userId,
        contenido: `📎 ${fileName}`,
        tipo: "archivo",
        leido: false,
        fecha_leido: null,
        created_at: new Date().toISOString(),
        imagen_url: null,
        archivo_url: null, // No tenemos URL remota aún
        archivo_nombre: fileName,
        propiedad_id: null,
      };

      if (isMountedRef.current) {
        setMessages((prev) => [...prev, tempMessage]);
      }

      // 3. Subir archivo
      const uploadedUrl = await uploadFile(fileUri, "files");
      if (!uploadedUrl) throw new Error("Failed to upload file");

      // 4. Insertar mensaje
      const messageData: any = {
        conversacion_id: finalConversationId,
        emisor_id: userId,
        tipo: "archivo",
        archivo_url: uploadedUrl,
        archivo_nombre: fileName,
        contenido: `📎 ${fileName}`,
      };

      if (metadata) {
        messageData.metadata = metadata;
      }

      const { data, error } = await supabase
        .from("mensajes")
        .insert(messageData)
        .select();

      if (error) throw error;

      // 5. Confirmar éxito
      if (data && data.length > 0 && isMountedRef.current) {
        const newMessage = data[0];
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.id);
          const filtered = prev.filter((msg) => msg.id !== tempId);
          return exists ? filtered : [...filtered, newMessage];
        });
      }

      if (finalConversationId) {
        await supabase
          .from("conversaciones")
          .update({
            ultimo_mensaje_preview: `📎 ${fileName}`,
            ultimo_mensaje_en: new Date().toISOString(),
          })
          .eq("id", finalConversationId);
      }

      return true;
    } catch (err: any) {
      log.error("Error sending file:", err);
      if (isMountedRef.current) {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        showModal({
          title: "Error",
          message: "No se pudo enviar el archivo.",
          confirmText: "OK",
        });
        setError(err.message);
      }
      return false;
    } finally {
      if (isMountedRef.current) setSending(false);
    }
  };

  /**
   * Enviar propiedad (Optimistic UI)
   */
  const sendProperty = async (
    propertyId: string,
    note?: string,
    metadata?: { destinatario_id: string; propiedad_id: string | null },
  ) => {
    if (!userId) return false;

    if (!conversationId && !metadata) {
      log.error("Missing metadata for new conversation property share");
      return false;
    }

    setSending(true);
    const tempId = `temp-${Date.now()}`;

    try {
      // 1. Asegurar ID de conversación
      let finalConversationId = conversationId;
      if (!finalConversationId || finalConversationId === "new") {
        if (!metadata) throw new Error("Metadata requerida para nuevo chat");
        finalConversationId = await getOrCreateConversation(metadata);
        if (!finalConversationId) throw new Error("No se pudo crear el chat");
      }

      // 2. Optimistic Update
      const tempMessage: Message = {
        id: tempId,
        conversacion_id: finalConversationId,
        emisor_id: userId,
        tipo: "propiedad",
        propiedad_id: propertyId,
        contenido: note || "📍 Propiedad compartida",
        leido: false,
        fecha_leido: null,
        created_at: new Date().toISOString(),
        imagen_url: null,
        archivo_url: null,
        archivo_nombre: null,
      };

      if (isMountedRef.current) {
        setMessages((prev) => [...prev, tempMessage]);
      }

      // 3. Insertar
      const { data, error } = await supabase
        .from("mensajes")
        .insert({
          conversacion_id: finalConversationId,
          emisor_id: userId,
          tipo: "propiedad",
          propiedad_id: propertyId,
          contenido: note || "📍 Propiedad compartida",
        })
        .select(
          `
          *,
          propiedad:propiedades(
            id,
            tipo,
            subtipo,
            descripcion,
            fotos,
            ciudad,
            operaciones:operaciones_propiedad(
              tipo_operacion,
              precio,
              moneda
            )
          )
        `,
        );

      if (error) throw error;

      // 4. Confirmar éxito
      if (data && data.length > 0 && isMountedRef.current) {
        const newMessage = data[0];
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.id);
          const filtered = prev.filter((msg) => msg.id !== tempId);
          return exists ? filtered : [...filtered, newMessage];
        });
      }

      if (finalConversationId) {
        await supabase
          .from("conversaciones")
          .update({
            ultimo_mensaje_preview: "📍 Propiedad",
            ultimo_mensaje_en: new Date().toISOString(),
          })
          .eq("id", finalConversationId);
      }

      return true;
    } catch (err: any) {
      log.error("Error sending property:", err);
      if (isMountedRef.current) {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
        showModal({
          title: "Error",
          message: "No se pudo compartir la propiedad.",
          confirmText: "OK",
        });
        setError(err.message);
      }
      return false;
    } finally {
      if (isMountedRef.current) setSending(false);
    }
  };

  /**
   * Marcar mensajes como leídos
   */
  const markAsRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;

    try {
      const { error } = await supabase
        .from("mensajes")
        .update({
          leido: true,
          fecha_leido: new Date().toISOString(),
        })
        .in("id", messageIds)
        .eq("leido", false);

      if (error) throw error;
      await updateUnreadCounters();
    } catch (err: any) {
      log.error("Error marking as read:", err);
    }
  };

  const updateUnreadCounters = async () => {
    if (!conversationId || !userId) return;

    try {
      const { data: conv, error } = await supabase
        .from("conversaciones")
        .select("id, usuario1_id, usuario2_id")
        .eq("id", conversationId)
        .single();

      if (error || !conv) return;

      const isUsuario1 = conv.usuario1_id === userId;
      const conversationUpdate = isUsuario1
        ? { mensajes_no_leidos_usuario1: 0 }
        : { mensajes_no_leidos_usuario2: 0 };

      // Update conversations (source of truth for counters)
      await supabase
        .from("conversaciones")
        .update(conversationUpdate)
        .eq("id", conversationId);

      // Try to update groupings (might be a view, so we wrap in try/catch and ignore specific errors)
      try {
        const groupUpdate = isUsuario1
          ? { total_mensajes_no_leidos_usuario1: 0 }
          : { total_mensajes_no_leidos_usuario2: 0 };

        await supabase
          .from("agrupaciones_conversaciones")
          .update(groupUpdate)
          .or(
            `and(usuario1_id.eq.${conv.usuario1_id},usuario2_id.eq.${conv.usuario2_id}),and(usuario1_id.eq.${conv.usuario2_id},usuario2_id.eq.${conv.usuario1_id})`,
          );
      } catch (groupError) {
        // Ignore errors if this is a view
        log.debug(
          "Note: Could not update agrupaciones_conversaciones, likely a view.",
        );
      }
    } catch (err) {
      log.error("Error updating unread counters:", err);
    }
  };

  /**
   * Marcar mensajes visibles como leídos automáticamente
   */
  const markVisibleAsRead = useCallback(() => {
    if (!userId || messages.length === 0) return;

    const unreadIds = messages
      .filter((msg) => !msg.leido && msg.emisor_id !== userId)
      .map((msg) => msg.id);

    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  }, [userId, messages]);

  /**
   * Cargar más mensajes
   */
  const loadMore = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(nextPage, true);
  };

  /**
   * Limpiar canal Realtime
   */
  const cleanupChannel = async () => {
    if (channelRef.current) {
      log.debug("🧹 Cleaning up messages subscription");
      try {
        await supabase.removeChannel(channelRef.current);
      } catch (err) {
        log.warn("⚠️ Error removing messages channel:", err);
      }
      channelRef.current = null;
      currentConversationIdRef.current = null;
    }
  };

  /**
   * Configurar suscripción Realtime
   * FIX: Solo se crea UNA vez por conversación
   */
  /**
   * Configurar suscripción Realtime
   * FIX: Solo se crea UNA vez por conversación y maneja reconexiones
   */
  const setupRealtimeSubscription = async (convId: string) => {
    // Si ya existe para esta conversación, no crear otra
    if (channelRef.current && currentConversationIdRef.current === convId) {
      return;
    }

    // Limpiar suscripción anterior
    await cleanupChannel();

    log.debug(
      "📡 Setting up messages subscription for",
      convId.substring(0, 8),
    );

    const newChannel = supabase
      .channel(`messages-${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          // Nota: Filtramos en el cliente para evitar problemas con la sintaxis del filtro del servidor
          // si el UUID tiene formatos inconsistentes, aunque RLS ya debería filtrar.
          filter: `conversacion_id=eq.${convId}`,
        },
        async (payload) => {
          if (!isMountedRef.current) return;

          const newMessage = payload.new as Message;
          if (newMessage.conversacion_id !== convId) return;

          log.debug("📨 New message received via Realtime");

          // Intentar cargar mensaje completo con relaciones
          // NOTA: mensajes no tiene relación directa con propiedades,
          // y la columna de usuario es emisor_id
          try {
            const { data, error } = await supabase
              .from("mensajes")
              .select(
                `
                *,
                emisor:perfiles!emisor_id(
                  id,
                  nombre,
                  apellido_paterno,
                  foto
                )
              `,
              )
              .eq("id", newMessage.id)
              .single();

            if (data && isMountedRef.current) {
              setMessages((prev) => {
                // Evitar duplicados (por si ya estaba via optimistic ui o carga)
                if (prev.some((msg) => msg.id === data.id)) {
                  // Si existe pero es temporal (optimistic), reemplazarlo?
                  // (La lógica optimistic usa IDs temporales, así que id real no coincidirá salvo que ya haya sido reemplazado)
                  return prev;
                }
                return [...prev, data];
              });
              return;
            } else if (error) {
              throw error;
            }
          } catch (fetchError) {
            log.warn(
              "⚠️ Error fetching full message details, using payload:",
              fetchError,
            );
            // Fallback: usar el payload directo
            if (isMountedRef.current) {
              setMessages((prev) => {
                if (prev.some((msg) => msg.id === newMessage.id)) {
                  return prev;
                }
                return [...prev, newMessage];
              });
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "mensajes",
          filter: `conversacion_id=eq.${convId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          log.debug("📝 Message updated via Realtime");
          const updatedMsg = payload.new as Message;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg,
            ),
          );
        },
      )
      .subscribe((status, err) => {
        log.debug(`📡 Messages subscription status: ${status}`);
        if (status === "CHANNEL_ERROR") {
          log.error("❌ Realtime channel error:", err);
          // Opcional: Reintentar conexión?
        }
      });

    channelRef.current = newChannel;
    currentConversationIdRef.current = convId;
  };

  /**
   * Effect principal: Cargar mensajes y configurar Realtime
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      cleanupChannel();
      return;
    }

    // Cargar mensajes
    loadMessages(0);

    // Configurar Realtime solo si cambió la conversación
    if (conversationId !== currentConversationIdRef.current) {
      setupRealtimeSubscription(conversationId);
    }

    return () => {
      isMountedRef.current = false;
      cleanupChannel();
    };
  }, [conversationId]);

  /**
   * Effect para marcar como leído
   * Se ejecuta cuando cambian los mensajes o el ID de conversación
   */
  useEffect(() => {
    if (!conversationId || !userId) return;

    // 1. Resetear contadores de la conversación al entrar (force clear badge)
    updateUnreadCounters();

    // 2. Marcar mensajes específicos como leídos
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        markVisibleAsRead();
      }, 1000); // Reducido a 1 segundo para mejor UX

      return () => clearTimeout(timer);
    }
  }, [conversationId, messages.length, userId]);

  return {
    messages,
    loading,
    sending,
    error,
    hasMore,
    sendMessage,
    sendImage,
    sendFile,
    sendProperty,
    markAsRead,
    loadMore,
  };
}
