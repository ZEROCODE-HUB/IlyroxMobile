/**
 * useTags.ts
 * Hook para gestionar etiquetas de conversaciones
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Tag {
  id: string;
  nombre: string;
  color: string;
  usuario_id: string;
  created_at: string;
}

export function useTags(userId?: string) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar etiquetas del usuario
   */
  const loadTags = async () => {
    if (!userId) {
      setTags([]);
      return;
    }

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("etiquetas_conversacion")
        .select("*")
        .eq("usuario_id", userId)
        .order("nombre", { ascending: true });

      if (fetchError) throw fetchError;

      setTags(data || []);
      setError(null);
    } catch (err: any) {
      console.error("Error loading tags:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crear nueva etiqueta
   */
  const createTag = async (name: string, color: string) => {
    if (!userId || !name.trim()) return null;

    try {
      const { data, error } = await supabase
        .from("etiquetas_conversacion")
        .insert({
          nombre: name.trim(),
          color: color,
          usuario_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setTags((prev) => [...prev, data]);
      return data;
    } catch (err: any) {
      console.error("Error creating tag:", err);
      setError(err.message);
      return null;
    }
  };

  /**
   * Actualizar etiqueta
   */
  const updateTag = async (tagId: string, name: string, color: string) => {
    try {
      const { error } = await supabase
        .from("etiquetas_conversacion")
        .update({
          nombre: name.trim(),
          color: color,
        })
        .eq("id", tagId)
        .eq("usuario_id", userId);

      if (error) throw error;

      setTags((prev) =>
        prev.map((tag) =>
          tag.id === tagId ? { ...tag, nombre: name.trim(), color } : tag,
        ),
      );

      return true;
    } catch (err: any) {
      console.error("Error updating tag:", err);
      setError(err.message);
      return false;
    }
  };

  /**
   * Eliminar etiqueta
   */
  const deleteTag = async (tagId: string) => {
    try {
      // Eliminar asignaciones primero
      await supabase
        .from("conversacion_etiquetas")
        .delete()
        .eq("etiqueta_id", tagId);

      // Eliminar etiqueta
      const { error } = await supabase
        .from("etiquetas_conversacion")
        .delete()
        .eq("id", tagId)
        .eq("usuario_id", userId);

      if (error) throw error;

      setTags((prev) => prev.filter((tag) => tag.id !== tagId));
      return true;
    } catch (err: any) {
      console.error("Error deleting tag:", err);
      setError(err.message);
      return false;
    }
  };

  /**
   * Asignar etiqueta a conversación
   */
  const assignTag = async (conversationId: string, tagId: string) => {
    if (!userId) return false;

    try {
      // Verificar si ya está asignada
      const { data: existing } = await supabase
        .from("conversacion_etiquetas")
        .select("id")
        .eq("conversacion_id", conversationId)
        .eq("etiqueta_id", tagId)
        .single();

      if (existing) return true; // Ya existe

      const { error } = await supabase.from("conversacion_etiquetas").insert({
        conversacion_id: conversationId,
        etiqueta_id: tagId,
        asignada_por: userId,
      });

      if (error) throw error;

      return true;
    } catch (err: any) {
      console.error("Error assigning tag:", err);
      setError(err.message);
      return false;
    }
  };

  /**
   * Remover etiqueta de conversación
   */
  const removeTag = async (conversationId: string, tagId: string) => {
    try {
      const { error } = await supabase
        .from("conversacion_etiquetas")
        .delete()
        .eq("conversacion_id", conversationId)
        .eq("etiqueta_id", tagId);

      if (error) throw error;

      return true;
    } catch (err: any) {
      console.error("Error removing tag:", err);
      setError(err.message);
      return false;
    }
  };

  /**
   * Obtener etiquetas de una conversación
   */
  const getConversationTags = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("conversacion_etiquetas")
        .select(
          `
          etiqueta:etiquetas_conversacion(
            id,
            nombre,
            color
          )
        `,
        )
        .eq("conversacion_id", conversationId);

      if (error) throw error;

      return (data || []).map((item: any) => item.etiqueta).filter(Boolean);
    } catch (err: any) {
      console.error("Error getting conversation tags:", err);
      return [];
    }
  };

  useEffect(() => {
    if (!userId) {
      setTags([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchTags = async () => {
      if (isMounted) {
        await loadTags();
      }
    };

    fetchTags();

    return () => {
      isMounted = false;
    };
  }, [userId]); // Solo depende de userId

  return {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    assignTag,
    removeTag,
    getConversationTags,
    refresh: loadTags,
  };
}
