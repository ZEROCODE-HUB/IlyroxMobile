import { useState, useCallback } from "react";
import { profileService } from "../../../services/profileService";

export interface RecommendedUser {
  id: string;
  name: string;
  role?: string;
  avatar?: string | null;
}

export const useUserRecommendations = (userId?: string) => {
  const [recommendedList, setRecommendedList] = useState<RecommendedUser[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingRecommended(true);
      setRecommendedList([]);

      // Obtain recommendations using the service
      // We assume the service now supports retrieving the list with details
      // If getRecommendedByUsers returns perfiles[], we need to map it.

      const profiles = await profileService.getRecommendedByUsers(
        userId,
        0,
        49,
      );

      const mapped: RecommendedUser[] = (profiles || []).map((p: any) => {
        const name = [p?.nombre, p?.apellido_paterno, p?.apellido_materno]
          .filter(Boolean)
          .join(" ")
          .trim();
        return {
          id: p.id,
          name: name || "Usuario",
          role: p.rol,
          avatar: p.foto ?? null,
        };
      });

      setRecommendedList(mapped);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    } finally {
      setLoadingRecommended(false);
    }
  }, [userId]);

  return {
    recommendedList,
    loadingRecommended,
    fetchRecommendations,
  };
};
