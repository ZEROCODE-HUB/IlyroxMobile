import { create } from "zustand";

interface MatchesStore {
  /** Nº de matches (coincidencias + similares) sin ver del usuario, para el badge del header. */
  unseenCount: number;
  setUnseenCount: (count: number) => void;
}

/**
 * Store global del contador de matches sin ver. Lo alimenta
 * useUnseenMatchesCount (montado una vez en el layout de tabs) y lo lee el badge
 * de Matches en HomeHeader, igual que useCitasStore para las citas.
 */
export const useMatchesStore = create<MatchesStore>((set) => ({
  unseenCount: 0,
  setUnseenCount: (count) => set({ unseenCount: Math.max(0, count) }),
}));
