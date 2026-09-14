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
      const { data, error } = await supabase.rpc('get_enriched_notifications', {
        p_user_id: userId,
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

        setNotifications(enrichedNotifications);
        setUnreadCount(unread);
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
        setNotifications((prev) => {
          // Las notificaciones agrupadas representan N autores en un único
          // row. Decrementar por 1 subestima el contador. Tomamos el
          // `total_autores` real del state ANTES de mutar.
          const target = prev.find((n) => n.id === notificationId);
          const dec = Math.max(1, target?.total_autores ?? 1);
          setUnreadCount((c) => Math.max(0, c - dec));
          return prev.map((n) =>
            n.id === notificationId
              ? { ...n, estado: "leida" as const, leida_en: new Date().toISOString() }
              : n
          );
        });
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
      return;
    }

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
          if (payload.eventType === "INSERT") {
            // En lugar de insertar la fila cruda (sin autores ni thumbnail),
            // reusamos el RPC enrichment para tener la misma forma que la
            // carga inicial. Esto garantiza que la notificación aparece con
            // avatar, nombre, thumbnail y total_autores correctos desde el
            // primer render. El coste es 1 roundtrip por INSERT nuevo.
            fetchNotifications();
            setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE") {
            const updatedNotification = payload.new as Notificacion;
            const newData = (updatedNotification.data as Record<string, unknown>) || null;
            const newTotalAutor =
              ((newData?.author_ids as string[] | undefined) || []).length;
            setNotifications((prev) =>
              prev.map((n) => {
                if (n.id !== updatedNotification.id) return n;
                // Si el server acumuló más autores en `data.author_ids`,
                // sincronizamos el `data` y recalculamos `total_autores`.
                const total = newTotalAutor || n.total_autores;
                return {
                  ...n,
                  estado: updatedNotification.estado as "pendiente" | "leida",
                  leida_en: updatedNotification.leida_en as string | null,
                  data: newData || n.data,
                  total_autores: total,
                };
              })
            );
            if (updatedNotification.estado === "leida") {
              // El decremento agrupado se hace en `markAsRead` (vía state).
              // Aquí, el cambio viene del server (otra pestaña / trigger
              // externo), así que usamos el `total_autores` recalculado.
              setUnreadCount((prev) => Math.max(0, prev - Math.max(1, newTotalAutor || 1)));
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
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
