import { supabase } from "../lib/supabase";
import { Reel } from "../types";

export const reelService = {
  async reelsByUser(targetUserId: string) {
    const { data: reelsData, error: reelsError } = await supabase
      .from("reels")
      .select("*")
      .eq("publicado_por", targetUserId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (reelsError) {
      console.error("Error fetching reels:", reelsError);
    } else {
      return reelsData;
    }
  },

  async deleteReel(reel: Reel) {
    const { error } = await supabase
      .from("reels")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", reel.id);

    if (error) throw error;

    return alert("Reel eliminado correctamente");
  },
};
