/**
 * NotificationContext.tsx
 * Contexto centralizado para notificaciones con Realtime
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  const lastNotification = notifications[0] || null;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      console.log('🔔 [Notifications] RPC call starting with userId:', userId);
      const { data, error } = await supabase.rpc('get_enriched_notifications', {
        p_user_id: userId,
      });

      console.log('🔔 [Notifications] RPC result:', { 
        dataLength: data?.length, 
        error,
        firstRow: data?.[0]
      });

      if (error) {
        console.error('🔔 [Notifications] RPC ERROR:', error);
      }

      if (!error && data && data.length > 0) {
        console.log('🔔 [Notifications] Processing', data.length, 'notifications');
        
        const enrichedNotifications: NotificacionExtendida[] = data.map((row: any) => {
          console.log('🔔 [Notifications] Row:', {
            id: row.id,
            tipo: row.tipo,
            mensaje: row.mensaje?.substring(0, 50),
            autores: row.autores,
            thumbnail: row.thumbnail,
            tipo_contenido: row.tipo_contenido
          });
          
          return {
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
          };
        });

        console.log('🔔 [Notifications] Enriched notifications:', enrichedNotifications.length);
        const unread = enrichedNotifications.filter(n => n.estado === "pendiente").length;
        console.log('🔔 [Notifications] Unread count:', unread);
        
        setNotifications(enrichedNotifications);
        setUnreadCount(unread);
      } else {
        console.log('🔔 [Notifications] No data or error - notifications list stays empty');
      }
    } catch (err) {
      console.error("🔔 [Notifications] Exception:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const { count, error } = await supabase
        .from("user_notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("estado", "pendiente");

      if (!error) {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      console.error("Error fetching unread count:", err);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase.rpc("mark_notification_as_read", {
        p_notification_id: notificationId,
        p_user_id: userId,
      });

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, estado: "leida" as const, leida_en: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  }, [userId]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("user_notifications")
        .update({ estado: "leida", leida_en: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("estado", "pendiente");

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            estado: "leida" as const,
            leida_en: n.leida_en || new Date().toISOString(),
          }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    await fetchNotifications();
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) {
      console.log('🔔 [Notifications] No userId, skipping fetch');
      return;
    }

    console.log('🔔 [Notifications] Mounting with userId:', userId);

    // Fetch initial data
    fetchNotifications();
    fetchUnreadCount();

    // Setup realtime
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 [Notifications] Realtime payload:', payload.eventType, payload.new || payload.old);

          if (payload.eventType === "INSERT") {
            const newNotification = payload.new as Notificacion;
            console.log('🔔 [Notifications] INSERT event:', newNotification);
            const extendedNotification: NotificacionExtendida = {
              ...newNotification,
              autores: [],
              total_autores: ((newNotification.data?.author_ids as string[]) || []).length,
              contenido: null,
            };
            setNotifications((prev) => {
              const updated = [extendedNotification, ...prev].slice(0, 50);
              console.log('🔔 [Notifications] After INSERT, total notifications:', updated.length);
              return updated;
            });
            setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE") {
            const updatedNotification = payload.new as Notificacion;
            console.log('🔔 [Notifications] UPDATE event:', updatedNotification);
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === updatedNotification.id
                  ? { ...n, estado: updatedNotification.estado as "pendiente" | "leida", leida_en: updatedNotification.leida_en as string | null }
                  : n
              )
            );
            if (updatedNotification.estado === "leida") {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            console.log('🔔 [Notifications] DELETE event:', deletedId);
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
        realtimeChannelRef.current = null;
      }
    };
  }, [userId, fetchNotifications, fetchUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        lastNotification,
        isLoading,
        markAsRead,
        markAllAsRead,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
