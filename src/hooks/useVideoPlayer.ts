/**
 * Hook personalizado para manejar reproducción de video
 *
 * MIGRADO A EXPO-VIDEO desde expo-av
 *
 * NOTA: ReelListItem NO usa este hook — usa useExpoVideoPlayer directamente
 * dentro de un sub-componente para garantizar que el player y VideoView
 * comparten exactamente el mismo ciclo de vida de montaje/desmontaje.
 */

import { useState, useCallback, useEffect } from "react";
import { useVideoPlayer as useExpoVideoPlayer } from "expo-video";

export interface UseVideoPlayerOptions {
  videoSource: string;
  isVisible: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
}

export interface UseVideoPlayerReturn {
  player: ReturnType<typeof useExpoVideoPlayer>;
  isPlaying: boolean;
  status: string;
  progress: number;
  togglePlayPause: () => void;
}

export const useVideoPlayer = (
  options: UseVideoPlayerOptions,
): UseVideoPlayerReturn => {
  const {
    videoSource,
    isVisible,
    autoPlay = true,
    loop = true,
    muted = true,
  } = options;

  const [isPlaying, setIsPlaying] = useState(autoPlay && isVisible);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("idle");

  const player = useExpoVideoPlayer(videoSource, (p) => {
    p.loop = loop;
    p.muted = muted;
    // Emitir timeUpdate cada 100ms — misma fluidez que el polling, pero nativo
    p.timeUpdateEventInterval = 0.1;
    if (autoPlay && isVisible) {
      p.play();
    }
  });

  const togglePlayPause = useCallback(() => {
    try {
      if (!player) return;
      if (player.playing) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    } catch {
      // ignore if player was released
    }
  }, [player]);

  // Sincronizar play/pause con visibilidad
  useEffect(() => {
    try {
      if (!player) return;
      if (!isVisible) {
        player.volume = 0;
        player.muted = true;
        player.pause();
        setIsPlaying(false);
      } else if (autoPlay) {
        player.volume = 1;
        player.muted = muted;
        player.play();
        setIsPlaying(true);
      }
    } catch {
      // ignore released errors
    }
  }, [isVisible, autoPlay, player, muted]);

  // Sincronizar muted
  useEffect(() => {
    try {
      if (player) player.muted = muted;
    } catch {
      // ignore released errors
    }
  }, [muted, player]);

  // Listen to native player events instead of polling every 100ms
  useEffect(() => {
    if (!player) return;
    const playingSub = player.addListener("playingChange", ({ isPlaying }) => {
      setIsPlaying(isPlaying);
    });
    const statusSub = player.addListener("statusChange", ({ status }) => {
      setStatus(status);
    });
    const timeSub = player.addListener("timeUpdate", ({ currentTime }) => {
      try {
        if (player.duration > 0) {
          setProgress(
            Math.min(1, Math.max(0, currentTime / player.duration)),
          );
        }
      } catch {
        // player was released between events
      }
    });
    return () => {
      playingSub.remove();
      statusSub.remove();
      timeSub.remove();
      try {
        player?.release();
      } catch {
        // already released
      }
    };
  }, [player]);

  return { player, isPlaying, status, progress, togglePlayPause };
};
