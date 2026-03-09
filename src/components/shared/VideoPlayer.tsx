/**
 * VideoPlayer - Reproductor de video reutilizable
 *
 * Componente centralizado para reproducir videos. Maneja:
 * - Play/Pause con indicador visual
 * - Barra de progreso
 * - Auto-pausa por visibilidad
 * - Limpieza de recursos
 *
 * MIGRADO A EXPO-VIDEO desde expo-av
 *
 * @example
 * <VideoPlayer
 *   videoUrl="https://example.com/video.mp4"
 *   isVisible={true}
 *   aspectRatio={1}
 *   showTimeline={true}
 *   showPlayIcon={true}
 * />
 */

import React, { useEffect } from "react";
import { View, StyleSheet, TouchableWithoutFeedback } from "react-native";
import { VideoView } from "expo-video";
import { useVideoPlayer } from "@/hooks/hooks/useVideoPlayer";
import { DIMENSIONS, COLORS } from "@/constants";
import ProgressTimeline from "./ProgressTimeline";

export interface VideoPlayerProps {
  videoUrl: string;
  isVisible: boolean;
  aspectRatio?: number; // 1 = cuadrado, 16/9 = horizontal, etc.
  showControls?: boolean;
  showTimeline?: boolean;
  showPlayIcon?: boolean;
  isMuted?: boolean;
  autoPlay?: boolean;
  contentFit?: "contain" | "cover" | "fill";
  onPress?: () => void;
  onLongPress?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  isVisible,
  aspectRatio = 1,
  showControls = true,
  showTimeline = true,
  showPlayIcon = true,
  isMuted = true,
  autoPlay = true,
  contentFit = "cover",
  onPress,
  onLongPress,
}) => {
  // Video de fallback si no hay URL
  const videoSource = videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4";

  const { player, isPlaying, progress, togglePlayPause } = useVideoPlayer({
    videoSource,
    isVisible,
    autoPlay,
    muted: isMuted,
  });

  const handlePress = () => {
    if (showControls) {
      togglePlayPause();
    }
    onPress?.();
  };

  // useEffect(() => {
  //   return () => {
  //     player.release();
  //   };
  // }, []);

  return (
    <TouchableWithoutFeedback onPress={handlePress} onLongPress={onLongPress}>
      <View style={[styles.container, { width: "100%", aspectRatio }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit={contentFit}
          nativeControls={false}
        />

        {/* Timeline de progreso */}
        {showTimeline && (
          <View style={styles.timelineContainer}>
            <ProgressTimeline progress={progress} />
          </View>
        )}

        {/* Indicador de play/pause */}
        {showPlayIcon && !isPlaying && (
          <View style={styles.playIconWrapper}>
            <View style={styles.playIconContainer}>
              <View style={styles.playIcon} />
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.black,
    overflow: "hidden",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  timelineContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 12,
    zIndex: 10,
  },
  playIconWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  playIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.blackTransparent50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.whiteTransparent60,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 18,
    borderLeftColor: COLORS.whiteTransparent90,
    borderTopWidth: 12,
    borderTopColor: "transparent",
    borderBottomWidth: 12,
    borderBottomColor: "transparent",
    marginLeft: 5,
  },
});

export default React.memo(VideoPlayer);
