import { supabase } from "@/lib/supabase";
import { logger } from "@/utils/logger";

const log = logger.scoped("requestService");

export const requestService = {
  /**
   * Obtiene las solicitudes de información sobre propiedades que pertenecen al usuario
   */
  async getRequestsInfo(userId: string) {
    const { data, error } = await supabase
      .from("solicitudes_info")
      .select(
        `
        *,
        propiedad:propiedades!inner(
          id,
          tipo,
          estado,
          municipio,
          codigo_propiedad,
          fotos,
          created_by
        )
      `,
      )
      .eq("propiedad.created_by", userId)
      .order("created_at", { ascending: false });

    if (error) {
      log.error("Error fetching info requests:", error);
      throw error;
    }
    return data;
  },

  /**
   * Obtiene las solicitudes de propiedades (pendientes por implementar filtros) get_solicitudes_por_agente
   */
  async getRequestProperty() {
    const { data, error } = await supabase.rpc("get_solicitudes_match_agente");
    if (error) {
      log.error("Error fetching property requests:", error);
      throw error;
    }
    return data;
  },
};
