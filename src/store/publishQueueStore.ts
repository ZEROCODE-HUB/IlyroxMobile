import { create } from "zustand";

/**
 * REV26 (#5): cola global de publicacion de reels. La pantalla "Crear reel" solo deja el trabajo aqui y se cierra;
 * <BackgroundPublisher/> (montado en el layout raiz) lo sube y publica mientras el usuario navega por la app.
 */
export type PublishStatus = "preparando" | "subiendo" | "publicando" | "listo" | "error";

export interface PublishPayload {
  videoUri: string;
  thumbnailUri: string;
  description: string;
}

interface PublishQueueState {
  payload: PublishPayload | null;
  status: PublishStatus | null;
  progress: number;
  runId: number;
  enqueue: (p: PublishPayload) => void;
  setStatus: (s: PublishStatus | null) => void;
  setProgress: (n: number) => void;
  retry: () => void;
  clear: () => void;
}

export const usePublishQueueStore = create<PublishQueueState>((set) => ({
  payload: null,
  status: null,
  progress: 0,
  runId: 0,
  enqueue: (payload) => set((s) => ({ payload, status: "preparando", progress: 0, runId: s.runId + 1 })),
  setStatus: (status) => set({ status }),
  setProgress: (n) => set((s) => ({ progress: Math.max(s.progress, n) })),
  retry: () => set((s) => (s.payload ? { status: "preparando", progress: 0, runId: s.runId + 1 } : s)),
  clear: () => set({ payload: null, status: null, progress: 0 }),
}));
