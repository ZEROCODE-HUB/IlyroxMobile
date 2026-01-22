import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { profileService } from "../../../../services/profileService";
import { propertyService } from "../../../../services/propertyService";
import { postsService } from "../../../../services/postsService";
import { reelService } from "../../../../services/reelService";
import { perfiles, EstadisticasResenas, Property, Post, Reel } from "@/types";

export type RecommendedByUser = {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  foto: string | null;
  rol: "admin" | "agente" | "cliente";
};

interface UseProfileReturn {
  // Data
  profile: perfiles | null;
  reviewStats: EstadisticasResenas | null;
  userRecommendation: boolean | null;
  properties: Property[];
  posts: Post[];
  reels: Reel[];

  // Recommended Users Pagination
  recommendedByUsers: RecommendedByUser[];
  recommendedByHasMore: boolean;
  loadingRecommendedBy: boolean;
  recommendedByError: string | null;

  // Status
  loading: boolean;
  submittingRecommendation: boolean;

  // Actions
  fetchProfileData: () => Promise<void>;
  handleRecommendation: (recomienda: boolean) => Promise<void>;
  loadRecommendedByUsers: (options?: { reset?: boolean }) => Promise<void>;
  updateProfilePhoto: (newUrl: string) => void;
}

export const useProfile = (userId?: string | null): UseProfileReturn => {
  const { user: authUser, profile: authProfile } = useAuth();

  // Target User Logic
  const targetUserId = userId || authUser?.id;
  const isMe = !userId || targetUserId === authUser?.id;

  // Data State
  const [profile, setProfile] = useState<perfiles | null>(null);
  const [reviewStats, setReviewStats] = useState<EstadisticasResenas | null>(
    null,
  );
  const [userRecommendation, setUserRecommendation] = useState<boolean | null>(
    null,
  );
  const [properties, setProperties] = useState<Property[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);

  // Recommended By State
  const [recommendedByUsers, setRecommendedByUsers] = useState<
    RecommendedByUser[]
  >([]);
  const [recommendedByHasMore, setRecommendedByHasMore] = useState(false);
  const [recommendedByPage, setRecommendedByPage] = useState(0);
  const [loadingRecommendedBy, setLoadingRecommendedBy] = useState(false);
  const [recommendedByError, setRecommendedByError] = useState<string | null>(
    null,
  );

  // Status State
  const [loading, setLoading] = useState(true);
  const [submittingRecommendation, setSubmittingRecommendation] =
    useState(false);

  /**
   * Fetch All Data
   */
  const fetchProfileData = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Parallelize requests for speed
      // 1. Profile Data
      const profilePromise = (async () => {
        if (isMe && authProfile) {
          // Use cached auth profile if available and it's me
          return authProfile;
        }
        return await profileService.getProfile(targetUserId);
      })();

      // 2. Stats
      const statsPromise = profileService.getReviewStats(targetUserId);

      // 3. User Recommendation (if looking at someone else)
      const recommendationPromise =
        !isMe && authUser?.id
          ? profileService.getUserRecommendation(authUser.id, targetUserId)
          : Promise.resolve(null);

      // 4. Content (Properties, Posts, Videos)
      const propertiesPromise = propertyService.propertiesByUser(targetUserId);
      const postsPromise = postsService.postsByUser(targetUserId);
      const reelsPromise = reelService.reelsByUser(targetUserId);

      // Await all
      const [
        fetchedProfile,
        fetchedStats,
        fetchedRecommendation,
        fetchedProperties,
        fetchedPosts,
        fetchedReels,
      ] = await Promise.all([
        profilePromise,
        statsPromise,
        recommendationPromise,
        propertiesPromise,
        postsPromise,
        reelsPromise,
      ]);

      setProfile(fetchedProfile);
      setReviewStats(fetchedStats);
      setUserRecommendation(fetchedRecommendation);
      setProperties(fetchedProperties as Property[]);
      setPosts(fetchedPosts as Post[]);
      setReels(fetchedReels as Reel[]);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isMe, authProfile, authUser?.id]);

  /**
   * Recommendation Logic
   */
  const handleRecommendation = async (recomienda: boolean) => {
    if (!authUser?.id || !targetUserId || isMe || submittingRecommendation)
      return;

    try {
      setSubmittingRecommendation(true);

      const newStatus = await profileService.toggleRecommendation(
        authUser.id,
        targetUserId,
        userRecommendation,
        recomienda,
      );

      setUserRecommendation(newStatus);

      // Update stats immediately
      const newStats = await profileService.getReviewStats(targetUserId);
      if (newStats) {
        setReviewStats(newStats);
      }

      // If we are viewing the "recommended by" list, we might want to refresh it
      // but usually this is triggered by the UI.
    } catch (error) {
      console.error("Error updating recommendation:", error);
    } finally {
      setSubmittingRecommendation(false);
    }
  };

  /**
   * Load Recommended By Users (Pagination)
   */
  const loadRecommendedByUsers = async (options?: { reset?: boolean }) => {
    if (!targetUserId) return;

    try {
      const reset = options?.reset === true;
      setLoadingRecommendedBy(true);
      setRecommendedByError(null);

      const pageSize = 30;
      const nextPage = reset ? 0 : recommendedByPage;
      const from = nextPage * pageSize;
      const to = from + pageSize - 1;

      const results = await profileService.getRecommendedByUsers(
        targetUserId,
        from,
        to,
      );

      const mappedUsers = results as RecommendedByUser[];

      if (reset) {
        setRecommendedByUsers(mappedUsers);
      } else {
        setRecommendedByUsers((prev) => [...prev, ...mappedUsers]);
      }

      setRecommendedByHasMore(mappedUsers.length === pageSize);
      setRecommendedByPage(nextPage + 1);
    } catch (error: any) {
      if (options?.reset) {
        setRecommendedByUsers([]);
      }
      setRecommendedByHasMore(false);
      setRecommendedByError(
        error?.message || "Error al cargar recomendaciones",
      );
    } finally {
      setLoadingRecommendedBy(false);
    }
  };

  /**
   * Optimistic Update for Profile Photo
   */
  const updateProfilePhoto = (newUrl: string) => {
    setProfile((prev) => (prev ? { ...prev, foto: newUrl } : null));
  };

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  return {
    profile,
    reviewStats,
    userRecommendation,
    properties,
    posts,
    reels,

    recommendedByUsers,
    recommendedByHasMore,
    loadingRecommendedBy,
    recommendedByError,

    loading,
    submittingRecommendation,

    fetchProfileData,
    handleRecommendation,
    loadRecommendedByUsers,
    updateProfilePhoto,
  };
};
