/**
 * useConversations.ts
 * Hook para gestionar conversaciones con la nueva estructura de BD
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Conversation {
  id: string;
  usuario1_id: string;
  usuario2_id: string;
  total_conversaciones: number;
  total_mensajes_no_leidos: number;
  conversacion_mas_reciente_id: string | null;
  ultimo_mensaje_preview: string | null;
  ultima_actividad: string | null;
    etiquetas?: Array<{          // ← AGREGAR ESTA LÍNEA
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

  /**
   * Cargar agrupaciones de conversaciones
   */
  const loadConversations = async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: agrupaciones, error: fetchError } = await supabase
        .from('agrupaciones_conversaciones')
        .select(`
          *,
          usuario1:perfiles!usuario1_id(id, nombre, apellido_paterno, foto),
          usuario2:perfiles!usuario2_id(id, nombre, apellido_paterno, foto),
          conversacion_mas_reciente:conversaciones!conversacion_mas_reciente_id(
            ultimo_mensaje_preview,
            ultimo_mensaje_en
          )
        `)
        .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`)
        .order('ultima_actividad', { ascending: false });
        
      if (fetchError) throw fetchError;

      // Cargar etiquetas de todas las conversaciones del usuario
      const { data: allConversations } = await supabase
        .from('conversaciones')
        .select('id, usuario1_id, usuario2_id')
        .or(`usuario1_id.eq.${userId},usuario2_id.eq.${userId}`);

      const conversationIds = (allConversations || []).map(c => c.id);

      // Cargar todas las etiquetas de esas conversaciones
      const { data: conversationTags } = await supabase
        .from('conversacion_etiquetas')
        .select(`
          conversacion_id,
          etiqueta:etiquetas_conversacion(id, nombre, color)
        `)
        .in('conversacion_id', conversationIds);

      // Crear un mapa de conversación -> etiquetas
      const tagsMap = new Map<string, any[]>();
      (conversationTags || []).forEach((ct: any) => {
        if (ct.etiqueta) {
          const existing = tagsMap.get(ct.conversacion_id) || [];
          if (!existing.find(t => t.id === ct.etiqueta.id)) {
            existing.push(ct.etiqueta);
          }
          tagsMap.set(ct.conversacion_id, existing);
        }
      });

      // Procesar datos
      const processed = (agrupaciones || []).map((group: any) => {
        const isUsuario1 = group.usuario1_id === userId;
        const otherUser = isUsuario1 ? group.usuario2 : group.usuario1;
        const unreadCount = isUsuario1
          ? group.total_mensajes_no_leidos_usuario1
          : group.total_mensajes_no_leidos_usuario2;

        const lastConv = group.conversacion_mas_reciente;

        // Obtener todas las etiquetas de las conversaciones entre estos usuarios
        const groupConvs = (allConversations || []).filter((c: any) =>
          (c.usuario1_id === group.usuario1_id && c.usuario2_id === group.usuario2_id) ||
          (c.usuario1_id === group.usuario2_id && c.usuario2_id === group.usuario1_id)
        );

        // Recopilar todas las etiquetas únicas de estas conversaciones
        const allTags = new Map<string, any>();
        groupConvs.forEach((conv: any) => {
          const convTags = tagsMap.get(conv.id) || [];
          convTags.forEach(tag => {
            allTags.set(tag.id, tag);
          });
        });

        return {
          id: group.conversacion_mas_reciente_id || `${group.usuario1_id}_${group.usuario2_id}`,
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

      setConversations(processed);
      setError(null);
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener conversaciones específicas con un usuario
   */
  const getConversationsForUser = async (otherUserId: string) => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('conversaciones')
        .select(`
          *,
          propiedad:propiedades(id, tipo, subtipo, ciudad, fotos, operaciones_propiedad(precio, moneda))
        `)
        .or(`and(usuario1_id.eq.${userId},usuario2_id.eq.${otherUserId}),and(usuario1_id.eq.${otherUserId},usuario2_id.eq.${userId})`)
        .order('ultimo_mensaje_en', { ascending: false });

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
            moneda: operation?.moneda || 'MXN',
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
      console.error('Error getting specific conversations:', err);
      return [];
    }
  };

  /**
   * Configurar Realtime
   */
  useEffect(() => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    loadConversations();

    // Suscribirse a cambios en agrupaciones
    const channel = supabase
      .channel('agrupaciones_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agrupaciones_conversaciones',
          filter: `usuario1_id=eq.${userId}`,
        },
        () => loadConversations()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agrupaciones_conversaciones',
          filter: `usuario2_id=eq.${userId}`,
        },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
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