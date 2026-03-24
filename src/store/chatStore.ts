import { create } from "zustand";

interface ChatStore {
  totalUnreadCount: number;
  setTotalUnreadCount: (count: number) => void;
}

/**
 * Store global para gestionar el estado de los chats y mensajes.
 * Permite acceder al contador total de mensajes no leídos desde cualquier parte de la app.
 */
export const useChatStore = create<ChatStore>((set) => ({
  totalUnreadCount: 0,
  setTotalUnreadCount: (count) => set({ totalUnreadCount: Math.max(0, count) }),
}));
