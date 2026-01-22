/**
 * useConversations.ts - REFACTORIZADO
 * Hook para gestionar conversaciones con la nueva estructura de BD
 *
 * FIXES:
 * - Limpieza correcta de suscripciones Realtime
 * - Optimización de queries
 * - Prevención de loops infinitos
 * - Debouncing de recargas
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Conversation {
  id: string;
  usuario1_id: string;
  usuario2_id: string;
  total_conversaciones: number;
  total_mensajes_no_leidos: number;
  conversacion_mas_reciente_id: string | null;
  ultimo_mensaje_preview: string | null;
  ultima_actividad: string | null;
  etiquetas?: Array<{
    id: string;
    nombre: string;
    color: string;
  }>;
  other_user: {
    id: string;
    nombre: string;
    apellido_paterno: string;
    foto: string | null;
  };
}

export function useConversations(userId?: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs para control de suscripciones
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  /**
   * Cargar agrupaciones de conversaciones
   */
  const loadConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: agrupaciones, error: fetchError } = await supabase
        .from("agrupaciones_conversaciones")
        .select(
          `
          *,
          usuario1:perfiles!usuario1_id(id, nombre, apellido_paterno, foto),
          usuario2:perfiles!usuario2_id(id, nombre, apellido_paterno, foto),
          conversacion_mas_reciente:conversaciones!conversacion_mas_reciente_id(
            ultimo_mensaje_preview,
            ultimo_mensaje_en
          )
        `,
        )
        .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`)
        .order("ultima_actividad", { ascending: false });

      if (fetchError) throw fetchError;

      // Cargar etiquetas de todas las conversaciones del usuario
      const { data: allConversations } = await supabase
        .from("conversaciones")
        .select(
          "id, usuario1_id, usuario2_id, mensajes_no_leidos_usuario1, mensajes_no_leidos_usuario2",
        )
        .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`);

      const conversationIds = (allConversations || []).map((c) => c.id);

      // Cargar todas las etiquetas de esas conversaciones
      const { data: conversationTags } =
        conversationIds.length > 0
          ? await supabase
              .from("conversacion_etiquetas")
              .select(
                `
                conversacion_id,
                etiqueta:etiquetas_conversacion(id, nombre, color)
              `,
              )
              .in("conversacion_id", conversationIds)
          : { data: [] };

      // Crear un mapa de conversación -> etiquetas
      const tagsMap = new Map<string, any[]>();
      (conversationTags || []).forEach((ct: any) => {
        if (ct.etiqueta) {
          const existing = tagsMap.get(ct.conversacion_id) || [];
          if (!existing.find((t) => t.id === ct.etiqueta.id)) {
            existing.push(ct.etiqueta);
          }
          tagsMap.set(ct.conversacion_id, existing);
        }
      });

      // Procesar datos
      const processed = (agrupaciones || []).map((group: any) => {
        const isUsuario1 = group.usuario1_id === userId;
        const otherUser = isUsuario1 ? group.usuario2 : group.usuario1;
        const lastConv = group.conversacion_mas_reciente;

        // Calcular conteo de no leídos directamente de las conversaciones (Source of Truth)
        // en lugar de confiar en la vista/tabla de agrupaciones que puede estar desactualizada
        const groupConvs = (allConversations || []).filter(
          (c: any) =>
            (c.usuario1_id === group.usuario1_id &&
              c.usuario2_id === group.usuario2_id) ||
            (c.usuario1_id === group.usuario2_id &&
              c.usuario2_id === group.usuario1_id),
        );

        const unreadCount = groupConvs.reduce((total: number, conv: any) => {
          // Determine my role in THIS specific conversation
          const amInConvUsuario1 = conv.usuario1_id === userId;

          const count = amInConvUsuario1
            ? conv.mensajes_no_leidos_usuario1
            : conv.mensajes_no_leidos_usuario2;
          return total + (count || 0);
        }, 0);

        // Recopilar todas las etiquetas únicas de estas conversaciones
        const allTags = new Map<string, any>();
        groupConvs.forEach((conv: any) => {
          const convTags = tagsMap.get(conv.id) || [];
          convTags.forEach((tag) => {
            allTags.set(tag.id, tag);
          });
        });

        return {
          id:
            group.conversacion_mas_reciente_id ||
            `${group.usuario1_id}_${group.usuario2_id}`,
          usuario1_id: group.usuario1_id,
          usuario2_id: group.usuario2_id,
          total_conversaciones: group.total_conversaciones,
          total_mensajes_no_leidos: unreadCount,
          conversacion_mas_reciente_id: group.conversacion_mas_reciente_id,
          ultimo_mensaje_preview: lastConv?.ultimo_mensaje_preview,
          ultima_actividad: lastConv?.ultimo_mensaje_en,
          other_user: otherUser,
          etiquetas: Array.from(allTags.values()),
        };
      });

      // Ordenar por última actividad
      processed.sort((a: any, b: any) => {
        const dateA = new Date(a.ultima_actividad || 0).getTime();
        const dateB = new Date(b.ultima_actividad || 0).getTime();
        return dateB - dateA;
      });

      if (!isMountedRef.current) return;

      setConversations(processed);
      setError(null);
    } catch (err: any) {
      console.error("Error loading conversations:", err);
      if (isMountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  /**
   * Recargar con debounce
   * Previene múltiples recargas rápidas
   */
  const debouncedReload = useCallback(() => {
    // Cancelar recarga pendiente
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
    }

    // Programar nueva recarga en 500ms
    reloadTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        console.log("🔄 Reloading conversations (debounced)");
        loadConversations();
      }
    }, 500);
  }, [loadConversations]);

  /**
   * Obtener conversaciones específicas con un usuario
   */
  const getConversationsForUser = async (otherUserId: string) => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from("conversaciones")
        .select(
          `
          *,
          propiedad:propiedades(id, tipo, subtipo, ciudad, fotos, operaciones_propiedad(precio, moneda))
        `,
        )
        .or(
          `and(usuario1_id.eq.${userId},usuario2_id.eq.${otherUserId}),and(usuario1_id.eq.${otherUserId},usuario2_id.eq.${userId})`,
        )
        .order("ultimo_mensaje_en", { ascending: false });

      if (error) throw error;

      return (data || []).map((conv: any) => {
        const isUsuario1 = conv.usuario1_id === userId;
        const unreadCount = isUsuario1
          ? conv.mensajes_no_leidos_usuario1
          : conv.mensajes_no_leidos_usuario2;

        // Transformar datos de propiedad
        let propiedad = null;
        if (conv.propiedad) {
          const operation = conv.propiedad.operaciones_propiedad?.[0];
          propiedad = {
            id: conv.propiedad.id,
            tipo: conv.propiedad.tipo,
            subtipo: conv.propiedad.subtipo,
            ciudad: conv.propiedad.ciudad,
            precio: operation?.precio || 0,
            moneda: operation?.moneda || "MXN",
            imagenes: conv.propiedad.fotos || [],
          };
        }

        return {
          id: conv.id,
          propiedad_id: conv.propiedad_id,
          propiedad,
          unread_count: unreadCount,
          ultimo_mensaje_preview: conv.ultimo_mensaje_preview,
          ultimo_mensaje_en: conv.ultimo_mensaje_en,
        };
      });
    } catch (err: any) {
      console.error("Error getting specific conversations:", err);
      return [];
    }
  };

  /**
   * Limpiar canal Realtime
   */
  const cleanupChannel = async () => {
    if (channelRef.current) {
      console.log("🧹 Cleaning up conversations subscription");
      try {
        await supabase.removeChannel(channelRef.current);
      } catch (err) {
        console.warn("⚠️ Error removing conversations channel:", err);
      }
      channelRef.current = null;
      currentUserIdRef.current = null;
    }
  };

  /**
   * Configurar suscripción Realtime
   * FIX: Solo se crea UNA vez por usuario
   */
  // Al inicio del hook, agrega:
  const setupInProgressRef = useRef(false);

  // Modifica setupRealtimeSubscription:
  const setupRealtimeSubscription = async (uid: string) => {
    console.log("🔍 setupRealtimeSubscription called");
    console.log("🔍 setupInProgressRef:", setupInProgressRef.current);

    // FIX: Si ya está en progreso, salir inmediatamente
    if (setupInProgressRef.current) {
      console.log("⚠️ Setup already in progress, aborting");
      return;
    }

    console.log("🔍 uid:", uid.substring(0, 8));
    console.log("🔍 channelRef.current exists?", !!channelRef.current);
    console.log(
      "🔍 currentUserIdRef.current:",
      currentUserIdRef.current?.substring(0, 8),
    );
    console.log("🔍 Are they equal?", currentUserIdRef.current === uid);

    // Si ya existe para este usuario, no crear otra
    if (channelRef.current && currentUserIdRef.current === uid) {
      console.log("✅ Conversations subscription already exists");
      return;
    }

    // Marcar como en progreso
    setupInProgressRef.current = true;

    try {
      // Limpiar suscripción anterior
      await cleanupChannel();

      console.log(
        "📡 Setting up conversations subscription for",
        uid.substring(0, 8),
      );

      const channel = supabase
        .channel(`conversations-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "agrupaciones_conversaciones",
            filter: `usuario1_id=eq.${uid}`,
          },
          () => {
            console.log("📨 Conversation update received (usuario1)");
            debouncedReload();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "agrupaciones_conversaciones",
            filter: `usuario2_id=eq.${uid}`,
          },
          () => {
            console.log("📨 Conversation update received (usuario2)");
            debouncedReload();
          },
        )
        // Listen to direct changes on conversaciones table (Source of Truth for unread counts)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversaciones",
            filter: `usuario1_id=eq.${uid}`,
          },
          () => {
            console.log("📨 Conversation update received (conversaciones u1)");
            debouncedReload();
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversaciones",
            filter: `usuario2_id=eq.${uid}`,
          },
          () => {
            console.log("📨 Conversation update received (conversaciones u2)");
            debouncedReload();
          },
        )
        .subscribe((status) => {
          console.log("📡 Conversations subscription status:", status);
          // Desmarcar cuando termina (éxito o error)
          setupInProgressRef.current = false;
        });

      channelRef.current = channel;
      currentUserIdRef.current = uid;
    } catch (error) {
      console.error("Error setting up subscription:", error);
      setupInProgressRef.current = false;
    }
  };

  /**
   * Effect principal
   */
  useEffect(() => {
    console.log("🔍 useConversations useEffect triggered");
    console.log("🔍 userId:", userId?.substring(0, 8));
    console.log(
      "🔍 currentUserIdRef:",
      currentUserIdRef.current?.substring(0, 8),
    );
    console.log("🔍 isInitializingRef:", isInitializingRef.current);

    isMountedRef.current = true;

    // FIX: Si userId es undefined, NO limpiar
    if (userId === undefined) {
      console.log("⚠️ userId is undefined, skipping cleanup");
      return;
    }

    if (!userId) {
      setConversations([]);
      setLoading(false);
      cleanupChannel();
      isInitializingRef.current = false;
      return;
    }

    // FIX: Prevenir doble inicialización
    if (isInitializingRef.current && userId === currentUserIdRef.current) {
      console.log("⚠️ Already initializing for this user, skipping");
      return;
    }

    isInitializingRef.current = true;

    // Cargar conversaciones
    (async () => {
      await loadConversations();
      isInitializingRef.current = false;
    })();

    // Configurar Realtime solo si cambió el usuario
    if (userId !== currentUserIdRef.current) {
      setupRealtimeSubscription(userId);
    }

    return () => {
      isMountedRef.current = false;
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }
      // Solo limpiar si userId tiene valor
      if (userId) {
        cleanupChannel();
        isInitializingRef.current = false;
      }
    };
  }, [userId]);

  return {
    conversations,
    getConversationsForUser,
    loading,
    error,
    refresh: loadConversations,
  };
}
