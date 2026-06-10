import { create } from "zustand";
import { perfiles, EstadisticasResenas, Property, Post, Reel } from "@/types";

export type RecommendedByUser = {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  foto: string | null;
  rol: "admin" | "agente" | "cliente";
};

interface ProfileState {
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
  recommendedByPage: number;
  recommendedByLoaded: boolean;

  // Not Recommended Users Pagination (espejo del positivo)
  notRecommendedByUsers: RecommendedByUser[];
  notRecommendedByHasMore: boolean;
  loadingNotRecommendedBy: boolean;
  notRecommendedByError: string | null;
  notRecommendedByPage: number;
  notRecommendedByLoaded: boolean;

  // Status
  loading: boolean;
  submittingRecommendation: boolean;

  // Actions
  setProfile: (profile: perfiles | null) => void;
  setReviewStats: (stats: EstadisticasResenas | null) => void;
  setUserRecommendation: (recommendation: boolean | null) => void;
  setProperties: (properties: Property[]) => void;
  setPosts: (posts: Post[]) => void;
  setReels: (reels: Reel[]) => void;

  setRecommendedByUsers: (
    users:
      | RecommendedByUser[]
      | ((prev: RecommendedByUser[]) => RecommendedByUser[]),
  ) => void;
  setRecommendedByHasMore: (hasMore: boolean) => void;
  setLoadingRecommendedBy: (loading: boolean) => void;
  setRecommendedByError: (error: string | null) => void;
  setRecommendedByPage: (page: number | ((prev: number) => number)) => void;
  setRecommendedByLoaded: (loaded: boolean) => void;

  setNotRecommendedByUsers: (
    users:
      | RecommendedByUser[]
      | ((prev: RecommendedByUser[]) => RecommendedByUser[]),
  ) => void;
  setNotRecommendedByHasMore: (hasMore: boolean) => void;
  setLoadingNotRecommendedBy: (loading: boolean) => void;
  setNotRecommendedByError: (error: string | null) => void;
  setNotRecommendedByPage: (page: number | ((prev: number) => number)) => void;
  setNotRecommendedByLoaded: (loaded: boolean) => void;

  setLoading: (loading: boolean) => void;
  setSubmittingRecommendation: (submitting: boolean) => void;

  // Reset function
  resetProfileState: () => void;
}

const initialState = {
  profile: null,
  reviewStats: null,
  userRecommendation: null,
  properties: [],
  posts: [],
  reels: [],
  recommendedByUsers: [],
  recommendedByHasMore: false,
  loadingRecommendedBy: false,
  recommendedByError: null,
  recommendedByPage: 0,
  recommendedByLoaded: false,
  notRecommendedByUsers: [],
  notRecommendedByHasMore: false,
  loadingNotRecommendedBy: false,
  notRecommendedByError: null,
  notRecommendedByPage: 0,
  notRecommendedByLoaded: false,
  loading: true,
  submittingRecommendation: false,
};

/**
 * Creates a generic profile store
 */
const createProfileStore = () =>
  create<ProfileState>((set) => ({
    ...initialState,

    setProfile: (profile) => set({ profile }),
    setReviewStats: (reviewStats) => set({ reviewStats }),
    setUserRecommendation: (userRecommendation) => set({ userRecommendation }),
    setProperties: (properties) => set({ properties }),
    setPosts: (posts) => set({ posts }),
    setReels: (reels) => set({ reels }),

    setRecommendedByUsers: (users) =>
      set((state) => ({
        recommendedByUsers:
          typeof users === "function" ? users(state.recommendedByUsers) : users,
      })),
    setRecommendedByHasMore: (recommendedByHasMore) =>
      set({ recommendedByHasMore }),
    setLoadingRecommendedBy: (loadingRecommendedBy) =>
      set({ loadingRecommendedBy }),
    setRecommendedByError: (recommendedByError) => set({ recommendedByError }),
    setRecommendedByPage: (page) =>
      set((state) => ({
        recommendedByPage:
          typeof page === "function" ? page(state.recommendedByPage) : page,
      })),
    setRecommendedByLoaded: (recommendedByLoaded) =>
      set({ recommendedByLoaded }),

    setNotRecommendedByUsers: (users) =>
      set((state) => ({
        notRecommendedByUsers:
          typeof users === "function"
            ? users(state.notRecommendedByUsers)
            : users,
      })),
    setNotRecommendedByHasMore: (notRecommendedByHasMore) =>
      set({ notRecommendedByHasMore }),
    setLoadingNotRecommendedBy: (loadingNotRecommendedBy) =>
      set({ loadingNotRecommendedBy }),
    setNotRecommendedByError: (notRecommendedByError) =>
      set({ notRecommendedByError }),
    setNotRecommendedByPage: (page) =>
      set((state) => ({
        notRecommendedByPage:
          typeof page === "function"
            ? page(state.notRecommendedByPage)
            : page,
      })),
    setNotRecommendedByLoaded: (notRecommendedByLoaded) =>
      set({ notRecommendedByLoaded }),

    setLoading: (loading) => set({ loading }),
    setSubmittingRecommendation: (submittingRecommendation) =>
      set({ submittingRecommendation }),

    resetProfileState: () => set(initialState),
  }));

/**
 * Store for external users' profiles
 */
export const useProfileStore = createProfileStore();

/**
 * Store for the authenticated user's own profile
 * Separated to avoid data override/leakage bugs when navigating
 */
export const useAuthProfileStore = createProfileStore();
