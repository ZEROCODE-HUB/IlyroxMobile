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

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Platform } from "react-native";

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

      const { data, error } = await supabase.storage
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
      return newConv.id;
    } catch (err: any) {
      console.error("Error ensuring conversation exists:", err);
      // Si falla por unique constraint race condition, intentar buscar de nuevo
      if (err.code === "23505") {
        // Unique violation
        // Retry logic could go here, for now return null/throw
      }
      return null;
    }
  };

  /**
   * Enviar mensaje de texto
   */
  const sendMessage = async (
    text: string,
    metadata?: { destinatario_id: string; propiedad_id: string | null },
  ) => {
    if (!userId || !text.trim()) {
      return false;
    }

    if (!conversationId && !metadata) {
      console.error("Missing metadata for new conversation message");
      return false;
    }

    setSending(true);

    try {
      // Asegurar ID de conversación
      let finalConversationId = conversationId;
      if (!finalConversationId || finalConversationId === "new") {
        if (!metadata) throw new Error("Metadata requerida para nuevo chat");
        finalConversationId = await getOrCreateConversation(metadata);
        if (!finalConversationId) throw new Error("No se pudo crear el chat");
      }

      const messageData: any = {
        conversacion_id: finalConversationId,
        emisor_id: userId,
        contenido: text.trim(),
        tipo: "texto",
      };

      if (metadata) {
        messageData.metadata = metadata;
      }

      const { data, error } = await supabase
        .from("mensajes")
        .insert(messageData)
        .select();

      if (error) throw error;

      // ✅ Optimistic update: agregar inmediatamente al estado
      if (data && data.length > 0 && isMountedRef.current) {
        const newMessage = data[0];
        setMessages((prev) => {
          // Evitar duplicados si ya llegó por Realtime
          if (prev.some((msg) => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }

      if (conversationId) {
        await supabase
          .from("conversaciones")
          .update({
            ultimo_mensaje_preview: text.trim().substring(0, 100),
            ultimo_mensaje_en: new Date().toISOString(),
          })
          .eq("id", conversationId);
      }

      return data?.[0] || true;
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message);
      return false;
    } finally {
      setSending(false);
    }
  };

  /**
   * Enviar imagen
   */
  const sendImage = async (
    imageUri: string,
    metadata?: { destinatario_id: string; propiedad_id: string | null },
  ) => {
    if (!userId) return false;

    setSending(true);

    try {
      // Asegurar ID de conversación
      let finalConversationId = conversationId;
      if (!finalConversationId || finalConversationId === "new") {
        if (!metadata) throw new Error("Metadata requerida para nuevo chat");
        finalConversationId = await getOrCreateConversation(metadata);
        if (!finalConversationId) throw new Error("No se pudo crear el chat");
      }

      const uploadedUrl = await uploadFile(imageUri, "images");
      if (!uploadedUrl) throw new Error("Failed to upload image");

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

      // ✅ Optimistic update: agregar inmediatamente al estado
      if (data && data.length > 0 && isMountedRef.current) {
        const newMessage = data[0];
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }

      if (conversationId) {
        await supabase
          .from("conversaciones")
          .update({
            ultimo_mensaje_preview: "📷 Imagen",
            ultimo_mensaje_en: new Date().toISOString(),
          })
          .eq("id", conversationId);
      }

      return true;
    } catch (err: any) {
      console.error("Error sending image:", err);
      setError(err.message);
      return false;
    } finally {
      setSending(false);
    }
  };

  /**
   * Enviar archivo
   */
  const sendFile = async (
    fileUri: string,
    fileName: string,
    metadata?: { destinatario_id: string; propiedad_id: string | null },
  ) => {
    if (!userId) return false;

    setSending(true);

    try {
      // Asegurar ID de conversación
      let finalConversationId = conversationId;
      if (!finalConversationId || finalConversationId === "new") {
        if (!metadata) throw new Error("Metadata requerida para nuevo chat");
        finalConversationId = await getOrCreateConversation(metadata);
        if (!finalConversationId) throw new Error("No se pudo crear el chat");
      }

      const uploadedUrl = await uploadFile(fileUri, "files");
      if (!uploadedUrl) throw new Error("Failed to upload file");

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

      // ✅ Optimistic update: agregar inmediatamente al estado
      if (data && data.length > 0 && isMountedRef.current) {
        const newMessage = data[0];
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }

      if (conversationId) {
        await supabase
          .from("conversaciones")
          .update({
            ultimo_mensaje_preview: `📎 ${fileName}`,
            ultimo_mensaje_en: new Date().toISOString(),
          })
          .eq("id", conversationId);
      }

      return true;
    } catch (err: any) {
      console.error("Error sending file:", err);
      setError(err.message);
      return false;
    } finally {
      setSending(false);
    }
  };

  /**
   * Enviar propiedad
   */
  const sendProperty = async (propertyId: string, note?: string) => {
    if (!conversationId || !userId) return false;

    setSending(true);

    try {
      const { error } = await supabase.from("mensajes").insert({
        conversacion_id: conversationId,
        emisor_id: userId,
        tipo: "propiedad",
        propiedad_id: propertyId,
        contenido: note || "📍 Propiedad compartida",
      });

      if (error) throw error;

      // NO agregamos al estado local - Realtime lo hará

      await supabase
        .from("conversaciones")
        .update({
          ultimo_mensaje_preview: "📍 Propiedad",
          ultimo_mensaje_en: new Date().toISOString(),
        })
        .eq("id", conversationId);

      return true;
    } catch (err: any) {
      console.error("Error sending property:", err);
      setError(err.message);
      return false;
    } finally {
      setSending(false);
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
      console.error("Error marking as read:", err);
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
        console.log(
          "Note: Could not update agrupaciones_conversaciones, likely a view.",
        );
      }
    } catch (err) {
      console.error("Error updating unread counters:", err);
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
      console.log("🧹 Cleaning up messages subscription");
      try {
        await supabase.removeChannel(channelRef.current);
      } catch (err) {
        console.warn("⚠️ Error removing messages channel:", err);
      }
      channelRef.current = null;
      currentConversationIdRef.current = null;
    }
  };

  /**
   * Configurar suscripción Realtime
   * FIX: Solo se crea UNA vez por conversación
   */
  const setupRealtimeSubscription = async (convId: string) => {
    // Si ya existe para esta conversación, no crear otra
    if (channelRef.current && currentConversationIdRef.current === convId) {
      console.log(
        "✅ Messages subscription already exists for",
        convId.substring(0, 8),
      );
      return;
    }

    // Limpiar suscripción anterior
    await cleanupChannel();

    console.log(
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
          filter: `conversacion_id=eq.${convId}`,
        },
        async (payload) => {
          if (!isMountedRef.current) return;

          console.log("📨 New message received via Realtime");

          // Cargar mensaje completo con relaciones
          const { data } = await supabase
            .from("mensajes")
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
            )
            .eq("id", payload.new.id)
            .single();

          if (data && isMountedRef.current) {
            setMessages((prev) => {
              // Evitar duplicados
              if (prev.some((msg) => msg.id === data.id)) {
                return prev;
              }
              return [...prev, data];
            });
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

          console.log("📝 Message updated via Realtime");

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg,
            ),
          );
        },
      )
      .subscribe((status) => {
        console.log("📡 Messages subscription status:", status);
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
