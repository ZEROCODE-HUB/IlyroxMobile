import { useState } from "react";
import { Post, Reel } from "../../types";
import { postsService } from "../../services/postsService";
import { reelService } from "../../services/reelService";

export const useGridProfile = () => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);

  const getPosts = async (userId: string) => {
    setLoading(true);
    try {
      const data = await postsService.postsByUser(userId);
      if (data) {
        setPosts(data);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const getReels = async (userId: string) => {
    setLoading(true);
    try {
      const data = await reelService.reelsByUser(userId);
      if (data) {
        setReels(data);
      }
    } catch (error) {
      console.error("Error fetching reels:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (post: Post) => {
    setLoading(true);
    try {
      await postsService.deletePost(post);
    } catch (error) {
      console.error("Error deleting post:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteReel = async (reel: Reel) => {
    setLoading(true);
    try {
      await reelService.deleteReel(reel);
    } catch (error) {
      console.error("Error deleting reel:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    posts,
    reels,
    getPosts,
    getReels,
    deletePost,
    deleteReel,
  };
};
