import { supabase } from "@/lib/supabase";
import { Post } from "@/types";
import * as Burnt from "burnt";

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
      return [];
    }

    if (!postsData || postsData.length === 0) return [];

    const postsIds = postsData.map((p) => p.id);
    const { data: feedData, error: feedError } = await supabase
      .from("feed_items")
      .select("id, contenido_id, likes_count, comentarios_count")
      .eq("tipo_contenido", "post")
      .in("contenido_id", postsIds);

    if (feedError) {
      console.error("Error fetching feed_items for posts:", feedError);
      return postsData;
    }

    const feedMap = new Map(feedData?.map((f) => [f.contenido_id, f]) || []);

    return postsData.map((post) => {
      const feedItem = feedMap.get(post.id);
      return {
        ...post,
        feed_item_id: feedItem?.id,
        likes_count: feedItem?.likes_count || 0,
        comentarios_count: feedItem?.comentarios_count || 0,
      };
    });
  },

  async deletePost(post: Post) {
    const { error } = await supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", post.id);

    if (error) throw error;

    return Burnt.toast({
      title: "Post eliminado correctamente",
      preset: "done",
    });
  },

  async getPostById(postId: string) {
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .is("deleted_at", null)
      .maybeSingle();

    if (postError) {
      console.error("Error fetching post:", postError);
      return null;
    }

    if (!postData) return null;

    // Get feed item info for this post
    const { data: feedData, error: feedError } = await supabase
      .from("feed_items")
      .select("id, likes_count, comentarios_count")
      .eq("tipo_contenido", "post")
      .eq("contenido_id", postId)
      .maybeSingle();

    if (feedError) {
      console.error("Error fetching feed_item for post detail:", feedError);
      return postData;
    }

    return {
      ...postData,
      feed_item_id: feedData?.id,
      likes_count: feedData?.likes_count || 0,
      comentarios_count: feedData?.comentarios_count || 0,
    };
  },
};
