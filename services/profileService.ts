import { supabase } from "../lib/supabase";
import { perfiles, EstadisticasResenas } from "../types";

export const profileService = {
  async getProfile(userId: string) {
    const { data: profile, error } = await supabase
      .from("perfiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return profile as perfiles | null;
  },

  async getReviewStats(userId: string) {
    const { data: statsData, error: statsError } = await supabase
      .from("vw_estadisticas_resenas")
      .select("*")
      .eq("profesional_id", userId)
      .maybeSingle();

    if (statsError) throw statsError;
    return statsData as EstadisticasResenas | null;
  },

  async getUserRecommendation(recommenderId: string, targetUserId: string) {
    const { data, error } = await supabase
      .from("recomendaciones_usuarios")
      .select("recomienda")
      .eq("usuario_recomendado_id", targetUserId)
      .eq("recomendado_por", recommenderId)
      .maybeSingle();

    if (error) throw error;
    return data?.recomienda ?? null;
  },

  async getRecommendedByUsers(targetUserId: string, from: number, to: number) {
    const { data: recsData, error: recsError } = await supabase
      .from("recomendaciones_usuarios")
      .select("recomendado_por")
      .eq("usuario_recomendado_id", targetUserId)
      .eq("recomienda", true)
      .range(from, to);

    if (recsError) throw recsError;

    const recommendedByIds = (recsData || [])
      .map((r: any) => r?.recomendado_por)
      .filter(Boolean) as string[];

    if (recommendedByIds.length === 0) return [];

    const { data: profilesData, error: profilesError } = await supabase
      .from("perfiles")
      .select("id,nombre,apellido_paterno,apellido_materno,foto,rol")
      .in("id", recommendedByIds);

    if (profilesError) throw profilesError;
    return profilesData || [];
  },

  async toggleRecommendation(
    recommenderId: string,
    targetUserId: string,
    currentStatus: boolean | null,
    newStatus: boolean
  ) {
    if (currentStatus === newStatus) {
      // Delete recommendation if clicking same status
      const { error } = await supabase
        .from("recomendaciones_usuarios")
        .delete()
        .eq("usuario_recomendado_id", targetUserId)
        .eq("recomendado_por", recommenderId);
      if (error) throw error;
      return null;
    } else if (currentStatus === null) {
      // Insert new recommendation
      const { error } = await supabase.from("recomendaciones_usuarios").insert({
        usuario_recomendado_id: targetUserId,
        recomendado_por: recommenderId,
        recomienda: newStatus,
      });
      if (error) throw error;
      return newStatus;
    } else {
      // Update existing recommendation
      const { error } = await supabase
        .from("recomendaciones_usuarios")
        .update({ recomienda: newStatus })
        .eq("usuario_recomendado_id", targetUserId)
        .eq("recomendado_por", recommenderId);
      if (error) throw error;
      return newStatus;
    }
  },

  async getRecommendationPreviewsForUsers(userIds: string[]) {
    const ids = Array.from(new Set(userIds.filter(Boolean)));
    if (ids.length === 0) return {};

    const recIdsByUserId = new Map<string, string[]>();

    // TODO: Si Supabase permitiera RPC o queries más complejas, esto sería una sola llamada.
    // get_recommendation_previews(user_ids)
    // Por ahora, limitamos la concurrencia para no saturar.

    let i = 0;
    const concurrency = 5;
    const workers = Array.from({ length: concurrency }, () =>
      (async () => {
        while (i < ids.length) {
          const current = ids[i];
          i += 1;

          // Solo necesitamos 1 para el preview
          const { data, error: recError } = await supabase
            .from("recomendaciones_usuarios")
            .select("recomendado_por")
            .eq("usuario_recomendado_id", current)
            .eq("recomienda", true)
            .limit(1);

          if (recError) {
            recIdsByUserId.set(current, []);
            continue;
          }

          const recommenderIds = (data || [])
            .map((r: any) => r?.recomendado_por)
            .filter(Boolean) as string[];
          recIdsByUserId.set(current, recommenderIds);
        }
      })()
    );

    await Promise.all(workers);

    const allRecommenderIds = Array.from(
      new Set(Array.from(recIdsByUserId.values()).flat())
    );

    const profilesById = new Map<
      string,
      { name: string; avatar: string | null }
    >();

    if (allRecommenderIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("perfiles")
        .select("id,nombre,apellido_paterno,apellido_materno,foto")
        .in("id", allRecommenderIds);

      if (!profilesError) {
        (profilesData || []).forEach((p: any) => {
          const name = [p?.nombre, p?.apellido_paterno, p?.apellido_materno]
            .filter(Boolean)
            .join(" ")
            .trim();
          profilesById.set(p.id, {
            name: name || "Usuario",
            avatar: p?.foto ?? null,
          });
        });
      }
    }

    const result: Record<string, any[]> = {};
    ids.forEach((id) => {
      const recommenderIds = recIdsByUserId.get(id) || [];
      result[id] = recommenderIds
        .map((rid) => {
          const info = profilesById.get(rid);
          if (!info) return null;
          return {
            id: rid,
            name: info.name,
            avatar: info.avatar,
          };
        })
        .filter(Boolean);
    });

    return result;
  },
};
