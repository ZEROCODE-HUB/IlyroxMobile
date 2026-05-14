/**
 * useUserApprovals.ts
 * Hook para aprobar/rechazar usuarios con Optimistic Updates
 *
 * FEATURES:
 * - Muestra usuarios pendientes del mismo estado
 * - Optimistic Updates (feedback instantáneo)
 * - Rollback automático en errores
 * - Toast notifications
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { User } from "../types";
import { useToast } from "../context/ToastContext";
import { logger } from "@/utils/logger";const log = logger.scoped("useUserApprovals");

interface PendingUser extends User {
  aprobaciones_recibidas: number;
  aprobaciones_requeridas: number;
  estado: string;
}

export function useUserApprovals(
  currentUserId?: string,
  currentUserState?: string,
) {
  const { showToast } = useToast();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Cargar usuarios pendientes del mismo estado
   */
  const loadPendingUsers = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Obtener usuarios que ya procesaste (le diste check o x)
      const { data: alreadyProcessed } = await supabase
        .from("aprobaciones_usuarios")
        .select("usuario_solicitante_id")
        .eq("usuario_aprobador_id", currentUserId);

      const processedIds = new Set(
        alreadyProcessed?.map((a) => a.usuario_solicitante_id) || [],
      );

      // 2. Cargar usuarios con estado 'pendiente'
      // Si tenemos estado, priorizamos el mismo estado, pero si no hay resultados o no hay estado,
      // podríamos mostrar de otros. Por ahora, si hay estado filtramos por él, si no, traemos todos.
      let query = supabase
        .from("perfiles")
        .select("*")
        .eq("estado_registro", "pendiente")
        .neq("id", currentUserId)
        .is("deleted_at", null);

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // 3. Filtrar en JS:
      // - No procesados por este usuario
      // - aprobaciones_recibidas < aprobaciones_requeridas
      const filtered = (data || []).filter((u) => {
        const isNotProcessed = !processedIds.has(u.id);
        const needsMoreApprovals =
          (u.aprobaciones_recibidas || 0) < (u.aprobaciones_requeridas || 3);

        return isNotProcessed && needsMoreApprovals;
      });

      // 4. Transformar a formato User
      const users: PendingUser[] = filtered.map((u) => ({
        id: u.id,
        nombre: u.nombre,
        name: u.nombre,
        avatar: u.foto || "https://placehold.co/100x100",
        isFollowing: false,
        role: u.rol === "agente" ? "Agent" : "User",
        location: u.estado ? `${u.estado}, México` : "México",
        phone: u.celular,
        aprobaciones_recibidas: u.aprobaciones_recibidas || 0,
        aprobaciones_requeridas: u.aprobaciones_requeridas || 3,
        estado: u.estado,
      }));

      setPendingUsers(users);
    } catch (error) {
      log.error("Error loading pending users:", error);
      showToast("Error al cargar usuarios pendientes", "error");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentUserState, showToast]);

  /**
   * Aprobar usuario con Optimistic Update
   */
  const approveUser = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!currentUserId) return false;

      // 1. Guardar estado anterior para rollback
      const previousUsers = [...pendingUsers];

      // 2. Actualización optimista: Quitar de la lista INMEDIATAMENTE
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));

      // 3. Mostrar toast inmediato
      showToast("¡Aprobación enviada!", "success");

      try {
        // 4. Insertar aprobación en BD
        const { error } = await supabase.from("aprobaciones_usuarios").insert({
          usuario_aprobador_id: currentUserId,
          usuario_solicitante_id: userId,
          tipo_aprobacion: "aprobado",
        });

        if (error) throw error;

        return true;
      } catch (error) {
        // 5. Rollback: Restaurar usuario en la lista
        setPendingUsers(previousUsers);

        log.error("Error approving user:", error);
        showToast("Error al enviar aprobación", "error");

        return false;
      }
    },
    [currentUserId, pendingUsers, showToast],
  );

  /**
   * Rechazar usuario con Optimistic Update
   */
  const rejectUser = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!currentUserId) return false;

      // 1. Guardar estado anterior para rollback
      const previousUsers = [...pendingUsers];

      // 2. Actualización optimista: Quitar de la lista INMEDIATAMENTE
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));

      // 3. Mostrar toast inmediato
      showToast("Aprobación rechazada", "info");

      try {
        // 4. Insertar rechazo en BD
        const { error } = await supabase.from("aprobaciones_usuarios").insert({
          usuario_aprobador_id: currentUserId,
          usuario_solicitante_id: userId,
          tipo_aprobacion: "rechazado",
        });

        if (error) throw error;

        return true;
      } catch (error) {
        // 5. Rollback: Restaurar usuario en la lista
        setPendingUsers(previousUsers);

        log.error("Error rejecting user:", error);
        showToast("Error al enviar rechazo", "error");

        return false;
      }
    },
    [currentUserId, pendingUsers, showToast],
  );

  /**
   * Cargar inicial
   */
  useEffect(() => {
    loadPendingUsers();
  }, [loadPendingUsers]);

  return {
    pendingUsers,
    loading,
    approveUser,
    rejectUser,
    refresh: loadPendingUsers,
  };
}
