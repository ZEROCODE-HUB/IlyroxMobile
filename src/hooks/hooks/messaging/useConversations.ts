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
import { AppState, AppStateStatus } from "react-native";
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

      // Cargar todas las conversaciones del usuario para calcular no leídos y actividad real
      const { data: allConversations } = await supabase
        .from("conversaciones")
        .select(
          "id, usuario1_id, usuario2_id, mensajes_no_leidos_usuario1, mensajes_no_leidos_usuario2, ultimo_mensaje_en, ultimo_mensaje_preview",
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

        // Buscar todas las conversaciones pertenecientes a este grupo (misma pareja de usuarios)
        const groupConvs = (allConversations || []).filter(
          (c: any) =>
            (c.usuario1_id === group.usuario1_id &&
              c.usuario2_id === group.usuario2_id) ||
            (c.usuario1_id === group.usuario2_id &&
              c.usuario2_id === group.usuario1_id),
        );

        // Encontrar la conversación realmente más reciente en este grupo
        const latestConvInGroup = groupConvs.reduce(
          (latest: any, current: any) => {
            if (!latest) return current;
            if (!current.ultimo_mensaje_en) return latest;
            if (!latest.ultimo_mensaje_en) return current;
            return new Date(current.ultimo_mensaje_en) >
              new Date(latest.ultimo_mensaje_en)
              ? current
              : latest;
          },
          null,
        );

        // Calcular conteo de no leídos directamente de las conversaciones (Source of Truth)
        const unreadCount = groupConvs.reduce((total: number, conv: any) => {
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
          conversacion_mas_reciente_id:
            latestConvInGroup?.id || group.conversacion_mas_reciente_id,
          ultimo_mensaje_preview:
            latestConvInGroup?.ultimo_mensaje_preview ||
            group.conversacion_mas_reciente?.ultimo_mensaje_preview,
          ultima_actividad:
            latestConvInGroup?.ultimo_mensaje_en || group.ultima_actividad,
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

    // Programar nueva recarga en 500ms (dar tiempo a triggers de BD)
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
   * Actualizar una sola conversación/agrupación
   * Más eficiente que recargar toda la lista
   */
  /**
   * Actualizar conversación basada en usuarios (Source of Truth: tabla conversaciones)
   * Evita depender de la vista agrupaciones_conversaciones que puede tener lag
   */
  const updateConversationByUsers = useCallback(
    async (u1: string, u2: string) => {
      if (!userId) return;

      try {
        // 1. Cargar TODAS las conversaciones entre estos dos usuarios directamente de la tabla base
        const { data: groupConversations, error } = await supabase
          .from("conversaciones")
          .select(
            `
            *,
            usuario1:perfiles!usuario1_id(id, nombre, apellido_paterno, foto),
            usuario2:perfiles!usuario2_id(id, nombre, apellido_paterno, foto),
            propiedad:propiedades(id, tipo, subtipo, ciudad, fotos, operaciones_propiedad(precio, moneda))
          `,
          )
          .or(
            `and(usuario1_id.eq.${u1},usuario2_id.eq.${u2}),and(usuario1_id.eq.${u2},usuario2_id.eq.${u1})`,
          );

        if (error || !groupConversations || groupConversations.length === 0) {
          // Si no hay conversaciones, intentar recargar todo por seguridad
          debouncedReload();
          return;
        }

        const groupConvs = groupConversations;
        const conversationIds = groupConvs.map((c) => c.id);

        // 2. Cargar etiquetas
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

        // 3. Calcular agregados manualmente
        const latestConvInGroup = groupConvs.reduce(
          (latest: any, current: any) => {
            if (!latest) return current;
            if (!current.ultimo_mensaje_en) return latest;
            if (!latest.ultimo_mensaje_en) return current;
            return new Date(current.ultimo_mensaje_en) >
              new Date(latest.ultimo_mensaje_en)
              ? current
              : latest;
          },
          null,
        );

        const unreadCount = groupConvs.reduce((total: number, conv: any) => {
          const amInConvUsuario1 = conv.usuario1_id === userId;
          const count = amInConvUsuario1
            ? conv.mensajes_no_leidos_usuario1
            : conv.mensajes_no_leidos_usuario2;
          return total + (count || 0);
        }, 0);

        const allTags = new Map<string, any>();
        groupConvs.forEach((conv: any) => {
          const convTags = tagsMap.get(conv.id) || [];
          convTags.forEach((tag) => {
            allTags.set(tag.id, tag);
          });
        });

        // Determinar el "otro usuario" (siempre es el que no soy yo)
        // Usamos la info de la conversación más reciente o la primera
        const referenceConv = latestConvInGroup || groupConvs[0];
        const isUsuario1InRef = referenceConv.usuario1_id === userId;
        const otherUser = isUsuario1InRef ? referenceConv.usuario2 : referenceConv.usuario1;

        // Construir objeto actualizado
        const updatedConversation = {
          id: latestConvInGroup?.id || `${u1}_${u2}`,
          usuario1_id: u1,
          usuario2_id: u2,
          total_conversaciones: groupConvs.length,
          total_mensajes_no_leidos: unreadCount,
          conversacion_mas_reciente_id: latestConvInGroup?.id,
          ultimo_mensaje_preview: latestConvInGroup?.ultimo_mensaje_preview,
          ultima_actividad: latestConvInGroup?.ultimo_mensaje_en,
          other_user: otherUser,
          etiquetas: Array.from(allTags.values()),
        };

        // 4. Actualizar estado
        setConversations((prev) => {
          const existingIndex = prev.findIndex(
            (c) =>
              (c.usuario1_id === u1 && c.usuario2_id === u2) ||
              (c.usuario1_id === u2 && c.usuario2_id === u1),
          );

          let newList;
          if (existingIndex >= 0) {
            newList = [...prev];
            newList[existingIndex] = updatedConversation;
          } else {
            newList = [updatedConversation, ...prev];
          }

          // Reordenar
          newList.sort((a: any, b: any) => {
            const dateA = new Date(a.ultima_actividad || 0).getTime();
            const dateB = new Date(b.ultima_actividad || 0).getTime();
            return dateB - dateA;
          });

          return newList;
        });

      } catch (err) {
        console.error("Error updating conversation by users:", err);
      }
    },
    [userId, debouncedReload],
  );

  const updateSingleConversation = useCallback(
    async (groupingId: string) => {
      if (!userId) return;

      try {
        // Cargar la agrupación actualizada
        const { data: agrupacion, error: fetchError } = await supabase
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
          .eq("id", groupingId)
          .single();

        if (fetchError || !agrupacion) {
          // Si no se encuentra, recargar toda la lista
          debouncedReload();
          return;
        }

        // Cargar todas las conversaciones de este grupo
        const { data: groupConversations } = await supabase
          .from("conversaciones")
          .select(
            "id, usuario1_id, usuario2_id, mensajes_no_leidos_usuario1, mensajes_no_leidos_usuario2, ultimo_mensaje_en, ultimo_mensaje_preview",
          )
          .or(
            `and(usuario1_id.eq.${agrupacion.usuario1_id},usuario2_id.eq.${agrupacion.usuario2_id}),and(usuario1_id.eq.${agrupacion.usuario2_id},usuario2_id.eq.${agrupacion.usuario1_id})`,
          );

        const groupConvs = groupConversations || [];
        const conversationIds = groupConvs.map((c) => c.id);

        // Cargar etiquetas de estas conversaciones
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

        // Crear mapa de etiquetas
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

        // Procesar la agrupación
        const isUsuario1 = agrupacion.usuario1_id === userId;
        const otherUser = isUsuario1 ? agrupacion.usuario2 : agrupacion.usuario1;

        // Encontrar conversación más reciente
        const latestConvInGroup = groupConvs.reduce(
          (latest: any, current: any) => {
            if (!latest) return current;
            if (!current.ultimo_mensaje_en) return latest;
            if (!latest.ultimo_mensaje_en) return current;
            return new Date(current.ultimo_mensaje_en) >
              new Date(latest.ultimo_mensaje_en)
              ? current
              : latest;
          },
          null,
        );

        // Calcular no leídos
        const unreadCount = groupConvs.reduce((total: number, conv: any) => {
          const amInConvUsuario1 = conv.usuario1_id === userId;
          const count = amInConvUsuario1
            ? conv.mensajes_no_leidos_usuario1
            : conv.mensajes_no_leidos_usuario2;
          return total + (count || 0);
        }, 0);

        // Recopilar etiquetas únicas
        const allTags = new Map<string, any>();
        groupConvs.forEach((conv: any) => {
          const convTags = tagsMap.get(conv.id) || [];
          convTags.forEach((tag) => {
            allTags.set(tag.id, tag);
          });
        });

        const updatedConversation = {
          id:
            agrupacion.conversacion_mas_reciente_id ||
            `${agrupacion.usuario1_id}_${agrupacion.usuario2_id}`,
          usuario1_id: agrupacion.usuario1_id,
          usuario2_id: agrupacion.usuario2_id,
          total_conversaciones: agrupacion.total_conversaciones,
          total_mensajes_no_leidos: unreadCount,
          conversacion_mas_reciente_id:
            latestConvInGroup?.id || agrupacion.conversacion_mas_reciente_id,
          ultimo_mensaje_preview:
            latestConvInGroup?.ultimo_mensaje_preview ||
            agrupacion.conversacion_mas_reciente?.ultimo_mensaje_preview,
          ultima_actividad:
            latestConvInGroup?.ultimo_mensaje_en || agrupacion.ultima_actividad,
          other_user: otherUser,
          etiquetas: Array.from(allTags.values()),
        };

        // Actualizar estado de forma optimizada
        setConversations((prev) => {
          // Buscar si ya existe
          const existingIndex = prev.findIndex(
            (c) =>
              (c.usuario1_id === agrupacion.usuario1_id &&
                c.usuario2_id === agrupacion.usuario2_id) ||
              (c.usuario1_id === agrupacion.usuario2_id &&
                c.usuario2_id === agrupacion.usuario1_id),
          );

          let newList;
          if (existingIndex >= 0) {
            // Reemplazar existente
            newList = [...prev];
            newList[existingIndex] = updatedConversation;
          } else {
            // Agregar nueva
            newList = [updatedConversation, ...prev];
          }

          // Reordenar por última actividad
          newList.sort((a: any, b: any) => {
            const dateA = new Date(a.ultima_actividad || 0).getTime();
            const dateB = new Date(b.ultima_actividad || 0).getTime();
            return dateB - dateA;
          });

          return newList;
        });
      } catch (err) {
        console.error("Error updating single conversation:", err);
        // Fallback: recargar todo
        debouncedReload();
      }
    },
    [userId, debouncedReload],
  );

  /**
   * Manejar actualización directa de tabla conversaciones
   */
  const handleConversationUpdate = useCallback(
    async (payload: any) => {
      const newConv = payload.new;
      if (!newConv || !newConv.usuario1_id || !newConv.usuario2_id) return;

      // Actualizar usando IDs de usuarios directamente
      updateConversationByUsers(newConv.usuario1_id, newConv.usuario2_id);
    },
    [updateConversationByUsers],
  );

  /**
   * Configurar suscripción Realtime
   * FIX: Solo se crea UNA vez por usuario
   */
  // Al inicio del hook, agrega:
  const setupInProgressRef = useRef(false);

  // Modifica setupRealtimeSubscription:
  const setupRealtimeSubscription = async (uid: string) => {
    // FIX: Si ya está en progreso, salir inmediatamente
    if (setupInProgressRef.current) {
      console.log("⚠️ Subscription setup already in progress, skipping");
      return;
    }

    // Si ya existe para este usuario, no crear otra
    if (channelRef.current && currentUserIdRef.current === uid) {
      console.log("✅ Channel already exists for this user, skipping");
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

      // SIMPLIFICADO: Escuchar TODOS los cambios en conversaciones
      // y filtrar en el cliente para evitar errores de "mismatch"
      const channel = supabase
        .channel(`conversations-realtime-${uid}`, {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
          },
        })
        // Escuchar TODOS los cambios en la tabla conversaciones
        // sin filtros de columna (esto evita el error de mismatch)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversaciones",
          },
          (payload) => {
            console.log("📨 Conversation change received:", payload.eventType);

            // Filtrar en el cliente: solo procesar si involucra a este usuario
            const conv = payload.new as any;
            if (conv && (conv.usuario1_id === uid || conv.usuario2_id === uid)) {
              console.log("✅ Change affects this user, updating...");
              handleConversationUpdate(payload);
            } else {
              console.log("⏭️ Change doesn't affect this user, ignoring");
            }
          },
        )
        .subscribe((status, err) => {
          console.log("📡 Realtime subscription status:", status);

          if (err) {
            console.error("❌ Subscription error:", err);
            console.error("Error details:", JSON.stringify(err, null, 2));
          }

          if (status === "SUBSCRIBED") {
            console.log("✅ Successfully subscribed to conversations realtime");
            setupInProgressRef.current = false;
          } else if (status === "CHANNEL_ERROR") {
            console.error("❌ Channel error - Check Supabase Realtime settings");
            console.error("Make sure Realtime is enabled for table: conversaciones");
            console.error("Check that RLS policies allow SELECT on conversaciones table");
            setupInProgressRef.current = false;
          } else if (status === "TIMED_OUT") {
            console.error("⏱️ Subscription timed out - retrying...");
            setupInProgressRef.current = false;
            // Reintentar después de un delay
            setTimeout(() => {
              if (isMountedRef.current) {
                setupRealtimeSubscription(uid);
              }
            }, 2000);
          } else if (status === "CLOSED") {
            console.log("🔒 Channel closed");
            setupInProgressRef.current = false;
          }
        });

      channelRef.current = channel;
      currentUserIdRef.current = uid;
      console.log("✅ Channel created for user:", uid.substring(0, 8));
    } catch (error) {
      console.error("❌ Error setting up subscription:", error);
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

    // FIX: Si ya tenemos canal para este usuario exacto y está todo configurado, no hacer nada
    if (
      currentUserIdRef.current === userId &&
      channelRef.current &&
      !isInitializingRef.current
    ) {
      console.log("✅ Already configured for this user, skipping");
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

      // Configurar Realtime solo si cambió el usuario o no existe canal
      if (userId !== currentUserIdRef.current || !channelRef.current) {
        await setupRealtimeSubscription(userId);
      }

      isInitializingRef.current = false;
    })();

    // Recargar cuando la app vuelve al foreground
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && isMountedRef.current && userId) {
        console.log("🔄 App came to foreground, reloading conversations");
        debouncedReload();
      }
    };

    const appStateSub = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      console.log("🧹 useConversations cleanup");
      isMountedRef.current = false;
      appStateSub.remove();
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }
      // Solo limpiar si cambió el usuario
      if (userId !== currentUserIdRef.current) {
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
