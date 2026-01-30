import { useState } from "react";

import { postsService } from "../../../services/postsService";
import { reelService } from "../../../services/reelService";
import { Post, Reel } from "@/types";

export const useGridProfile = () => {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [post, setPost] = useState<Post | any>();

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

  const getPostById = async (postId: string) => {
    setLoading(true);
    try {
      const data = await postsService.getPostById(postId);
      if (data) {
        setPost(data);
      }
    } catch (error) {
      console.error("Error fetching post:", error);
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
    getPostById,
  };
};
