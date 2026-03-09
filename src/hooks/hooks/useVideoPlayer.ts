/**
 * Hook personalizado para manejar reproducción de video
 *
 * Centraliza toda la lógica de control de video incluyendo:
 * - Play/Pause
 * - Tracking de progreso
 * - Auto-pausa por visibilidad
 * - Limpieza de recursos
 *
 * MIGRADO A EXPO-VIDEO desde expo-av
 *
 * @example
 * const {
 *   player,
 *   isPlaying,
 *   progress,
 *   togglePlayPause
 * } = useVideoPlayer({
 *   videoSource: 'https://example.com/video.mp4',
 *   isVisible: true,
 *   autoPlay: true
 * });
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

  // Crear player con expo-video
  const player = useExpoVideoPlayer(videoSource, (player) => {
    player.loop = loop;
    player.muted = muted;
    if (autoPlay && isVisible) {
      player.play();
    }
  });

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [player]);

  // Sincronizar estado local cuando cambia la visibilidad
  useEffect(() => {
    if (!isVisible) {
      player.pause();
      setIsPlaying(false);
    } else if (isVisible && autoPlay) {
      player.play();
      setIsPlaying(true);
    }
  }, [isVisible, autoPlay, player]);

  // Sincronizar estado de mute global
  useEffect(() => {
    if (player) {
      player.muted = muted;
    }
  }, [muted, player]);

  // Monitorear el estado del player
  useEffect(() => {
    // Actualizar progreso periódicamente
    const interval = setInterval(() => {
      if (player.duration > 0) {
        const currentProgress = player.currentTime / player.duration;
        setProgress(Math.min(1, Math.max(0, currentProgress)));
      }

      // Sincronizar isPlaying con el estado real del player
      setIsPlaying(player.playing);
    }, 100); // Actualizar cada 100ms

    return () => clearInterval(interval);
  }, [player]);

  return {
    player,
    isPlaying,
    progress,
    togglePlayPause,
  };
};
