import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { blockService } from "@/services/blockService";
import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

const log = logger.scoped("useUserBlock");

export function useUserBlock(
  blockerId?: string | null,
  blockedId?: string | null,
) {
  const queryClient = useQueryClient();
  const [isBlocked, setIsBlocked] = useState(false);
  // REV27: el otro usuario me bloqueo a mi (no debo ver su perfil ni su contenido, y no debo enterarme).
  const [blockedByOther, setBlockedByOther] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!blockerId || !blockedId || blockerId === blockedId) {
      setIsBlocked(false);
      setBlockedByOther(false);
      return false;
    }

    const next = await blockService.isBlocked(blockerId, blockedId);
    setIsBlocked(next);
    try {
      const sets = await blockService.getBlockSets(blockerId);
      setBlockedByOther(!next && sets.todos.includes(blockedId));
    } catch {
      setBlockedByOther(false);
    }
    return next;
  }, [blockerId, blockedId]);

  useEffect(() => {
    refresh().catch((error) => log.warn("refresh failed", error));
  }, [refresh]);

  const invalidateBlockedContent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["map-properties"] });
    queryClient.invalidateQueries({ queryKey: ["mapFeedItems"] });
    queryClient.invalidateQueries({ queryKey: ["propertyFeedItems"] });
    queryClient.invalidateQueries({ queryKey: ["property"] });
    // Invalidar la lista de conversaciones para que el chat del usuario
    // bloqueado/desbloqueado aparezca o desaparezca de inmediato.
    queryClient.invalidateQueries({ queryKey: ["conversations"] });
  }, [queryClient]);

  const block = useCallback(async () => {
    if (!blockerId || !blockedId) return;
    setLoading(true);
    try {
      await blockService.blockUser(blockerId, blockedId);
      setIsBlocked(true);
      // REV30b: eliminar matches mutuos al bloquear.
      // La tabla matches no tiene matched_usuario_id; el vinculo es:
      //   busquedas_guardadas.usuario_id  (dueno de la busqueda)
      //   propiedades.created_by          (dueno de la propiedad)
      // Se usa una funcion SQL para hacer el delete con join desde el cliente.
      try {
        await supabase.rpc("eliminar_matches_entre", {
          p_usuario_a: blockerId,
          p_usuario_b: blockedId,
        });
      } catch {
        /* sin efecto visual; el backend los filtra igual por bloqueo */
      }
      invalidateBlockedContent();
    } finally {
      setLoading(false);
    }
  }, [blockerId, blockedId, invalidateBlockedContent]);

  const unblock = useCallback(async () => {
    if (!blockerId || !blockedId) return;
    setLoading(true);
    try {
      await blockService.unblockUser(blockerId, blockedId);
      setIsBlocked(false);
      // REV32: encolar busquedas activas para regenerar matches con el usuario desbloqueado.
      // El cron process_match_jobs corre cada minuto y procesa los jobs automaticamente.
      try {
        await supabase.rpc("encolar_busquedas_al_desbloquear", {
          p_otro_usuario: blockedId,
        });
      } catch {
        /* sin efecto visual; el usuario puede guardar la busqueda manualmente si falla */
      }
      invalidateBlockedContent();
    } finally {
      setLoading(false);
    }
  }, [blockerId, blockedId, invalidateBlockedContent]);

  return {
    isBlocked,
    blockedByOther,
    loading,
    block,
    unblock,
    refresh,
  };
}
