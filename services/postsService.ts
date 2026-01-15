import { supabase } from "../lib/supabase";
import { Post } from "../types";

export const postsService = {
  async postsByUser(targetUserId: string) {
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .eq("publicado_por", targetUserId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
    } else {
      return postsData;
    }
  },

  async deletePost(post: Post) {
    const { error } = await supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", post.id);

    if (error) throw error;

    return alert("Post eliminado correctamente");
  },
};
