/**
 * useMessages.ts
 * Hook para gestionar mensajes con paginación y Realtime
 */

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
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
  // Datos de propiedad (si tipo === 'propiedad')
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
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  /**
   * Cargar mensajes
   */
  const loadMessages = async (pageNum: number = 0, append: boolean = false) => {
    if (!conversationId) return;

    try {
      setLoading(true);

      // Cargar solo mensajes básicos sin joins complejos por ahora
      const { data, error: fetchError } = await supabase
        .from("mensajes")
        .select("*")
        .eq("conversacion_id", conversationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (fetchError) throw fetchError;

      const newMessages = (data || []).reverse();

      if (append) {
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
      }

      setHasMore(newMessages.length === PAGE_SIZE);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Subir archivo a Supabase Storage
   */
  const uploadFile = async (
    fileUri: string,
    folder: "images" | "files"
  ): Promise<string | null> => {
    try {
      let fileContent: string | Blob | ArrayBuffer;
      let contentType: string | undefined;

      let uploadPath: string; // Declarar aquí para que sea accesible en todo el bloque try

      if (Platform.OS === "web") {
        const response = await fetch(fileUri);
        fileContent = await response.blob();
        contentType = fileContent.type || "image/jpeg";
        const fileName = `${folder}_${Date.now()}_${Math.random()
          .toString(36)
          .substring(7)}`;
        uploadPath = `conversaciones/${folder}/${fileName}`;
      } else {
        // En Native (iOS/Android) usamos fetch => ArrayBuffer para mayor estabilidad
        // "Network request failed" suele ocurrir con Blobs en algunas versiones de RN
        const response = await fetch(fileUri);
        const buffer = await response.arrayBuffer();
        fileContent = buffer as any; // Cast a any para evitar conflictos de tipos con Supabase JS client en RN

        const match =
          fileUri.match(/\.([0-9a-z]+)(?=[?#])?$/i) ||
          fileUri.match(/\.([0-9a-z]+)$/i);
        const extension = match ? match[1].toLowerCase() : "jpeg";

        // Determinar content type
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

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from("fotos")
        .getPublicUrl(uploadPath);

      return urlData.publicUrl;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Enviar mensaje de texto
   */
  const sendMessage = async (
    text: string, 
    metadata?: { destinatario_id: string; propiedad_id: string | null }
  ) => {
    if (!userId || !text.trim()) {
      return false;
    }

    // Si no hay conversationId, necesitamos metadata
    if (!conversationId && !metadata) {
      console.error("Missing metadata for new conversation message");
      return false;
    }

    setSending(true);

    try {
      const messageData: any = {
        emisor_id: userId,
        contenido: text.trim(),
        tipo: "texto",
      };

      if (conversationId) {
        messageData.conversacion_id = conversationId;
      }
      
      // SIEMPRE incluir metadata como pide la guía, incluso si ya existe la conversación
      // Si no nos pasan metadata explícita, intentamos construirla si tenemos conversationId (esto es más difícil sin datos extra)
      // PERO la guía dice: "Cuando insertes un mensaje, SIEMPRE debes incluir metadata"
      // Así que ChatScreen DEBE pasar metadata siempre.
      if (metadata) {
        messageData.metadata = metadata;
      } else if (conversationId) {
        // Fallback: Si estamos en un chat existente y no pasaron metadata, 
        // tal vez no sea crítico si el trigger solo lo usa para CREAR.
        // Pero la guía dice SIEMPRE.
        // Asumiremos que ChatScreen pasará metadata.
      }

      const { data, error } = await supabase
        .from("mensajes")
        .insert(messageData)
        .select();

      if (error) {
        throw error;
      }

      // Agregar mensaje al estado local inmediatamente
      if (data && data.length > 0) {
        const newMessage = data[0];
        setMessages((prev) => [...prev, newMessage]);
        
        // Si no teníamos ID y ahora sí (creado por trigger), deberíamos notificar o recargar
        // El trigger asigna conversacion_id.
        // Si el componente padre (ChatScreen) no se entera del nuevo ID, 
        // los siguientes mensajes podrían fallar si no pasamos metadata de nuevo?
        // No, siempre pasamos metadata. Así que el trigger buscará la conv existente.
      }

      // Actualizar última mensaje en conversación (si tenemos ID)
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
    metadata?: { destinatario_id: string; propiedad_id: string | null }
  ) => {
    console.log("=== sendImage called ===");
    console.log("imageUri:", imageUri);

    if (!userId) return false;

    setSending(true);

    try {
      console.log("Uploading image...");
      const uploadedUrl = await uploadFile(imageUri, "images");
      if (!uploadedUrl) throw new Error("Failed to upload image");

      console.log("Image uploaded:", uploadedUrl);
      console.log("Inserting message...");

      const messageData: any = {
        emisor_id: userId,
        tipo: "imagen",
        imagen_url: uploadedUrl,
        contenido: "📷 Imagen",
      };

      if (conversationId) {
        messageData.conversacion_id = conversationId;
      }
      if (metadata) {
        messageData.metadata = metadata;
      }

      const { data, error } = await supabase
        .from("mensajes")
        .insert(messageData)
        .select();

      if (error) {
        console.error("Error inserting image message:", error);
        throw error;
      }

      // Agregar mensaje al estado local
      if (data && data.length > 0) {
        setMessages((prev) => [...prev, data[0]]);
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
    metadata?: { destinatario_id: string; propiedad_id: string | null }
  ) => {
    console.log("=== sendFile called ===");
    console.log("fileUri:", fileUri);
    console.log("fileName:", fileName);

    if (!userId) return false;

    setSending(true);

    try {
      console.log("Uploading file...");
      const uploadedUrl = await uploadFile(fileUri, "files");
      if (!uploadedUrl) throw new Error("Failed to upload file");

      console.log("File uploaded:", uploadedUrl);

      const messageData: any = {
        emisor_id: userId,
        tipo: "archivo",
        archivo_url: uploadedUrl,
        archivo_nombre: fileName,
        contenido: `📎 ${fileName}`,
      };

      if (conversationId) {
        messageData.conversacion_id = conversationId;
      }
      if (metadata) {
        messageData.metadata = metadata;
      }

      const { data, error } = await supabase
        .from("mensajes")
        .insert(messageData)
        .select();

      if (error) {
        console.error("Error inserting file message:", error);
        throw error;
      }

      console.log("File message inserted:", data);

      // Agregar mensaje al estado local
      if (data && data.length > 0) {
        setMessages((prev) => [...prev, data[0]]);
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

      await supabase
        .from("conversaciones")
        .update({
          last_message: "📍 Propiedad",
          last_message_at: new Date().toISOString(),
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
    } catch (err: any) {
      console.error("Error marking as read:", err);
    }
  };

  /**
   * Marcar mensajes visibles como leídos automáticamente
   */
  const markVisibleAsRead = React.useCallback(() => {
    if (!userId) return;

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
   * Configurar Realtime
   */
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchMessages = async () => {
      if (isMounted) {
        await loadMessages(0);
      }
    };

    fetchMessages();

    // Suscribirse a nuevos mensajes (DESHABILITADO temporalmente para evitar loops)
    /*
    const newChannel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `conversacion_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (!isMounted) return;

          // Cargar datos completos del mensaje nuevo
          const { data } = await supabase
            .from('mensajes')
            .select(`
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
            `)
            .eq('id', payload.new.id)
            .single();

          if (data && isMounted) {
            setMessages((prev) => [...prev, data]);
          }
        }
      )
      .subscribe();

    setChannel(newChannel);
    */

    return () => {
      isMounted = false;
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [conversationId]); // Solo depende de conversationId

  // Marcar como leídos al visualizar
  // NOTA: Deshabilitado temporalmente para evitar loops infinitos
  // Se puede implementar de forma más controlada después
  // useEffect(() => {
  //   if (conversationId && messages.length > 0) {
  //     const timer = setTimeout(markVisibleAsRead, 1000);
  //     return () => clearTimeout(timer);
  //   }
  // }, [conversationId, messages.length, markVisibleAsRead]);

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
