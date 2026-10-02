/**
 * NotificationContext.tsx
 * Contexto centralizado para notificaciones con Realtime
 * 
 * FIX v3: 
 * - Previene re-suscripciones innecesarias cuando userId oscila
 * - markAsRead y markAllAsRead usan el userId del parámetro, no del ref
 * - Cuando el unreadCount llega a 0, se refleja inmediatamente en el badge
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  feed_item_id: string | null;
  data: Record<string, unknown>;
  estado: "pendiente" | "leida";
  leida_en: string | null;
  created_at: string;
}

export interface NotificacionAutor {
  id: string;
  nombre: string;
  foto: string | null;
}

export interface NotificacionContenido {
  id: string;
  thumbnail: string | null;
  tipo: "post" | "propiedad" | "reel";
}

export interface NotificacionExtendida extends Notificacion {
  autores: NotificacionAutor[];
  total_autores: number;
  contenido: NotificacionContenido | null;
}

interface NotificationContextType {
  notifications: NotificacionExtendida[];
  unreadCount: number;
  lastNotification: NotificacionExtendida | null;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  lastNotification: null,
  isLoading: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refresh: async () => {},
});

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
  userId: string | null;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, userId }) => {
  const [notifications, setNotifications] = useState<NotificacionExtendida[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs para control
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);
  
  // FIX: Mantener tracking del último userId verificado
  const lastUserIdRef = useRef<string | null>(null);
  const channelUserIdRef = useRef<string | null>(null);

  const lastNotification = notifications[0] || null;

  /**
   * Fetch completo de notificaciones desde la BD.
   */
  const fetchNotifications = useCallback(async (currentUserId: string) => {
    if (!currentUserId || isFetchingRef.current) return;

    isFetchingRef.current = true;
    console.log("🔔 [Notifications] fetchNotifications called, userId:", currentUserId);
    try {
      const { data, error } = await supabase.rpc('get_enriched_notifications', {
        p_user_id: currentUserId,
      });

      if (error) {
        console.error('🔔 [Notifications] RPC ERROR:', error);
      }

      if (!error && data && data.length > 0) {
        const enrichedNotifications: NotificacionExtendida[] = data.map((row: any) => ({
          id: row.id,
          tipo: row.tipo,
          titulo: row.titulo || '',
          mensaje: row.mensaje,
          feed_item_id: row.feed_item_id,
          data: row.data || {},
          estado: row.estado as "pendiente" | "leida",
          leida_en: row.leida_en,
          created_at: row.created_at,
          autores: row.autores || [],
          total_autores: row.total_autores || 0,
          contenido: row.thumbnail ? {
            id: row.contenido_id,
            thumbnail: row.thumbnail,
            tipo: row.tipo_contenido,
          } : null,
        }));

        const unread = enrichedNotifications.filter(n => n.estado === "pendiente").length;
        console.log("🔔 [Notifications] Setting unreadCount to:", unread, "from total notifications:", enrichedNotifications.length);

        if (isMountedRef.current) {
          setNotifications(enrichedNotifications);
          setUnreadCount(unread);
        }
      } else {
        if (isMountedRef.current) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    } catch (err) {
      console.error("🔔 [Notifications] Exception:", err);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  /**
   * Marca una notificación individual como leída.
   * FIX: Recibe userId como parámetro para evitar dependencias de refs.
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    // Usar el userId actual de la prop, no el ref (que puede estar desactualizado)
    const currentUserId = userId;
    console.log("🔔 [Notifications] markAsRead called, notificationId:", notificationId, "userId:", currentUserId);
    if (!currentUserId) return;

    try {
      const { error } = await supabase.rpc("mark_notification_as_read", {
        p_notification_id: notificationId,
        p_user_id: currentUserId,
      });

      if (!error && isMountedRef.current) {
        console.log("🔔 [Notifications] markAsRead success, updating local state");
        setNotifications((prev) => {
          const target = prev.find((n) => n.id === notificationId);
          const dec = Math.max(1, target?.total_autores ?? 1);
          console.log("🔔 [Notifications] Decrementing by:", dec);
          setUnreadCount((c) => {
            const newCount = Math.max(0, c - dec);
            console.log("🔔 [Notifications] unreadCount:", c, "->", newCount);
            return newCount;
          });
          return prev.map((n) =>
            n.id === notificationId
              ? { ...n, estado: "leida" as const, leida_en: new Date().toISOString() }
              : n
          );
        });
      } else if (error) {
        console.error("🔔 [Notifications] markAsRead error:", error);
      }
    } catch (err) {
      console.error("🔔 [Notifications] markAsRead exception:", err);
    }
  }, [userId]);

  /**
   * Marca TODAS las notificaciones como leídas.
   * FIX: Recibe userId como parámetro.
   */
  const markAllAsRead = useCallback(async () => {
    const currentUserId = userId;
    console.log("🔔 [Notifications] markAllAsRead called, userId:", currentUserId);
    if (!currentUserId) return;

    try {
      console.log("🔔 [Notifications] Updating all notifications to 'leida' in DB");
      const { error } = await supabase
        .from("user_notifications")
        .update({ estado: "leida", leida_en: new Date().toISOString() })
        .eq("user_id", currentUserId)
        .eq("estado", "pendiente");

      if (!error && isMountedRef.current) {
        console.log("🔔 [Notifications] markAllAsRead success, setting unreadCount to 0");
        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            estado: "leida" as const,
            leida_en: n.leida_en || new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
      } else if (error) {
        console.error("🔔 [Notifications] markAllAsRead error:", error);
      }
    } catch (err) {
      console.error("🔔 [Notifications] markAllAsRead exception:", err);
    }
  }, [userId]);

  /**
   * Refresh forzado.
   */
  const refresh = useCallback(async () => {
    if (userId) {
      await fetchNotifications(userId);
    }
  }, [userId, fetchNotifications]);

  // ============================================================
  // REALTIME SUBSCRIPTION
  // ============================================================
  useEffect(() => {
    isMountedRef.current = true;
    
    if (!userId) {
      console.log("🔔 [Notifications] Skipping - no userId");
      return;
    }
    
    // FIX: Si el userId no cambió y ya tenemos canal activo, no recrear
    if (userId === channelUserIdRef.current && channelRef.current) {
      console.log("🔔 [Notifications] Same userId, skipping channel recreation");
      lastUserIdRef.current = userId;
      return;
    }
    
    console.log("🔔 [Notifications] Setting up channel for userId:", userId);
    lastUserIdRef.current = userId;

    // Cleanup del canal anterior
    const cleanupChannel = () => {
      if (channelRef.current) {
        console.log("🔔 [Notifications] Removing previous channel");
        supabase.removeChannel(channelRef.current).catch((e) => {
          console.warn("🔔 [Notifications] Error removing channel:", e);
        });
        channelRef.current = null;
        channelUserIdRef.current = null;
      }
    };

    cleanupChannel();

    // Fetch inicial
    fetchNotifications(userId);

    // Crear canal con nombre ÚNICO por userId
    const channelName = `notifications-realtime-${userId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("🔔 [Notifications] Realtime event:", payload.eventType);
          
          if (payload.eventType === "INSERT") {
            console.log("🔔 [Notifications] INSERT detected, fetching fresh data");
            fetchNotifications(userId);
          } else if (payload.eventType === "UPDATE") {
            const updatedNotification = payload.new as Notificacion;
            if (!updatedNotification) return;

            console.log("🔔 [Notifications] UPDATE for:", updatedNotification.id, "estado:", updatedNotification.estado);

            const wasUnread = notifications.some(n => n.id === updatedNotification.id && n.estado === "pendiente");
            const isUnread = updatedNotification.estado === "pendiente";
            const newTotalAutor = ((updatedNotification.data as Record<string, unknown>)?.author_ids as string[] | undefined)?.length || 1;

            if (wasUnread && !isUnread) {
              setUnreadCount((prev) => Math.max(0, prev - Math.max(1, newTotalAutor)));
              console.log("🔔 [Notifications] Decrementing count");
            } else if (!wasUnread && isUnread) {
              setUnreadCount((prev) => prev + Math.max(1, newTotalAutor));
              console.log("🔔 [Notifications] Incrementing count");
            }

            setNotifications((prev) =>
              prev.map((n) => {
                if (n.id !== updatedNotification.id) return n;
                const total = newTotalAutor || n.total_autores;
                return {
                  ...n,
                  estado: updatedNotification.estado as "pendiente" | "leida",
                  leida_en: updatedNotification.leida_en as string | null,
                  data: (updatedNotification.data as Record<string, unknown>) || n.data,
                  total_autores: total,
                };
              })
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id;
            if (deletedId) {
              console.log("🔔 [Notifications] DELETE for:", deletedId);
              setNotifications((prev) => {
                const deletedNotif = prev.find(n => n.id === deletedId);
                const wasUnread = deletedNotif?.estado === "pendiente";
                if (wasUnread) {
                  setUnreadCount((c) => Math.max(0, c - Math.max(1, deletedNotif?.total_autores || 1)));
                }
                return prev.filter((n) => n.id !== deletedId);
              });
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log("🔔 [Notifications] Channel status:", status, "error:", err);
        if (status === "SUBSCRIBED") {
          channelUserIdRef.current = userId;
          console.log("🔔 [Notifications] Successfully subscribed for user:", userId);
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      isMountedRef.current = false;
      console.log("🔔 [Notifications] Effect cleanup");
      cleanupChannel();
    };
  }, [userId, fetchNotifications]);

  // ============================================================
  // APP STATE LISTENER
  // ============================================================
  useEffect(() => {
    if (!userId) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active" && userId) {
        console.log("🔔 [Notifications] App foreground, refreshing...");
        fetchNotifications(userId);
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [userId, fetchNotifications]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      lastNotification,
      isLoading,
      markAsRead,
      markAllAsRead,
      refresh,
    }),
    [notifications, unreadCount, lastNotification, isLoading, markAsRead, markAllAsRead, refresh],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
