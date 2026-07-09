import { create } from "zustand";

interface CitasStore {
  /** Nº de citas próximas pendientes del usuario (para el badge del header). */
  pendingCount: number;
  setPendingCount: (count: number) => void;
}

/**
 * Store global del contador de citas próximas pendientes. Lo alimenta
 * usePendingAppointmentsCount (montado una vez en el layout de tabs) y lo lee
 * el badge de Citas en HomeHeader, igual que useChatStore para los mensajes.
 */
export const useCitasStore = create<CitasStore>((set) => ({
  pendingCount: 0,
  setPendingCount: (count) => set({ pendingCount: Math.max(0, count) }),
}));
