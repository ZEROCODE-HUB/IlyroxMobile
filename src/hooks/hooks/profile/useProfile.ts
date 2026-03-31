import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { profileService } from "../../../services/profileService";
import { propertyService } from "../../../services/propertyService";
import { postsService } from "../../../services/postsService";
import { reelService } from "../../../services/reelService";
import { perfiles, EstadisticasResenas, Property, Post, Reel } from "@/types";
import {
  useProfileStore,
  useAuthProfileStore,
  RecommendedByUser,
} from "@/store/profileStore";

export type { RecommendedByUser };

interface UseProfileReturn {
  profile: perfiles | null;
  reviewStats: EstadisticasResenas | null;
  userRecommendation: boolean | null;
  properties: Property[];
  posts: Post[];
  reels: Reel[];
  recommendedByUsers: RecommendedByUser[];
  recommendedByHasMore: boolean;
  loadingRecommendedBy: boolean;
  recommendedByError: string | null;
  loading: boolean;
  submittingRecommendation: boolean;
  isMe: boolean;
  fetchProfileData: () => Promise<void>;
  handleRecommendation: (recomienda: boolean) => Promise<void>;
  loadRecommendedByUsers: (options?: { reset?: boolean }) => Promise<void>;
  updateProfilePhoto: (newUrl: string) => void;
}

export const useProfile = (userId?: string | null): UseProfileReturn => {
  const { user: authUser, profile: authProfile } = useAuth();
  const targetUserId = userId || authUser?.id;
  const isMe = !userId || targetUserId === authUser?.id;

  // Use selectors for data to ensure stability of the hook itself
  // and to only trigger re-renders on relevant data changes
  const activeStore = isMe ? useAuthProfileStore : useProfileStore;
  const state = activeStore();

  // Prevents infinite loop by using a ref to check if a fetch is in progress
  // and by NOT depending on the whole 'state' object in callbacks
  const isFetchingRef = useRef(false);
  const prevUserId = useRef<string | null | undefined>(null);

  useEffect(() => {
    if (targetUserId !== prevUserId.current) {
      if (!isMe) {
        useProfileStore.getState().resetProfileState();
      }
      prevUserId.current = targetUserId;
    }
  }, [targetUserId, isMe]);

  const fetchProfileData = useCallback(async () => {
    if (!targetUserId || isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      const storeActions = activeStore.getState();
      storeActions.setLoading(true);

      const profilePromise = (async () => {
        if (isMe && authProfile) return authProfile;
        return await profileService.getProfile(targetUserId);
      })();

      const statsPromise = profileService.getReviewStats(targetUserId);
      const recommendationPromise =
        !isMe && authUser?.id
          ? profileService.getUserRecommendation(authUser.id, targetUserId)
          : Promise.resolve(null);

      const propertiesPromise = propertyService.propertiesByUser(targetUserId);
      const postsPromise = postsService.postsByUser(targetUserId);
      const reelsPromise = reelService.reelsByUser(targetUserId);

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

      storeActions.setProfile(fetchedProfile);
      storeActions.setReviewStats(fetchedStats);
      storeActions.setUserRecommendation(fetchedRecommendation);
      storeActions.setProperties(fetchedProperties as Property[]);
      storeActions.setPosts(fetchedPosts as Post[]);
      storeActions.setReels(fetchedReels as Reel[]);
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      activeStore.getState().setLoading(false);
      isFetchingRef.current = false;
    }
  }, [targetUserId, isMe, authProfile, authUser?.id, activeStore]);

  const handleRecommendation = useCallback(async (recomienda: boolean) => {
    const storeState = activeStore.getState();
    if (!authUser?.id || !targetUserId || isMe || storeState.submittingRecommendation)
      return;

    try {
      storeState.setSubmittingRecommendation(true);

      const newStatus = await profileService.toggleRecommendation(
        authUser.id,
        targetUserId,
        storeState.userRecommendation,
        recomienda,
      );

      storeState.setUserRecommendation(newStatus);

      const newStats = await profileService.getReviewStats(targetUserId);
      if (newStats) {
        storeState.setReviewStats(newStats);
      }
    } catch (error) {
      console.error("Error updating recommendation:", error);
    } finally {
      activeStore.getState().setSubmittingRecommendation(false);
    }
  }, [authUser?.id, targetUserId, isMe, activeStore]);

  const loadRecommendedByUsers = useCallback(async (options?: { reset?: boolean }) => {
    if (!targetUserId) return;

    try {
      const storeState = activeStore.getState();
      const reset = options?.reset === true;
      storeState.setLoadingRecommendedBy(true);
      storeState.setRecommendedByError(null);

      const pageSize = 30;
      const nextPage = reset ? 0 : storeState.recommendedByPage;
      const from = nextPage * pageSize;
      const to = from + pageSize - 1;

      const results = await profileService.getRecommendedByUsers(
        targetUserId,
        from,
        to,
      );

      const mappedUsers = results as RecommendedByUser[];

      storeState.setRecommendedByUsers((prev) =>
        reset ? mappedUsers : [...prev, ...mappedUsers],
      );

      storeState.setRecommendedByHasMore(mappedUsers.length === pageSize);
      storeState.setRecommendedByPage((p) => (reset ? 1 : p + 1));
    } catch (error: any) {
      const storeState = activeStore.getState();
      if (options?.reset) {
        storeState.setRecommendedByUsers([]);
      }
      storeState.setRecommendedByHasMore(false);
      storeState.setRecommendedByError(
        error?.message || "Error al cargar recomendaciones",
      );
    } finally {
      activeStore.getState().setLoadingRecommendedBy(false);
    }
  }, [targetUserId, activeStore]);

  const updateProfilePhoto = useCallback(
    (newUrl: string) => {
      const currentProfile = activeStore.getState().profile;
      activeStore.getState().setProfile(
        currentProfile ? { ...currentProfile, foto: newUrl } : null,
      );
    },
    [activeStore],
  );

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  return {
    profile: state.profile,
    reviewStats: state.reviewStats,
    userRecommendation: state.userRecommendation,
    properties: state.properties,
    posts: state.posts,
    reels: state.reels,
    recommendedByUsers: state.recommendedByUsers,
    recommendedByHasMore: state.recommendedByHasMore,
    loadingRecommendedBy: state.loadingRecommendedBy,
    recommendedByError: state.recommendedByError,
    loading: state.loading,
    submittingRecommendation: state.submittingRecommendation,
    isMe,
    fetchProfileData,
    handleRecommendation,
    loadRecommendedByUsers,
    updateProfilePhoto,
  };
};
