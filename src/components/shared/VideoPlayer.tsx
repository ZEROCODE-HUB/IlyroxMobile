import React, { useEffect, useState } from "react";
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
  const [dynamicContentFit, setDynamicContentFit] =
    useState<"contain" | "cover">("cover");
  // Video de fallback si no hay URL
  const videoSource = videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4";

  const [dynamicAspectRatio, setDynamicAspectRatio] = useState<number>(aspectRatio);

  const { player, isPlaying, progress, togglePlayPause } = useVideoPlayer({
    videoSource,
    isVisible,
    autoPlay,
    muted: isMuted,
  });

  // Efecto para detectar si el video es horizontal o vertical
  useEffect(() => {
    if (!player) return;
    const subscription = (player as any).addListener(
      "videoSizeChange",
      (event: any) => {
        if (event.videoSize) {
          const { width, height } = event.videoSize;
          if (width > height) {
            // Video horizontal: ajusta el contenedor a su ratio real
            setDynamicContentFit("contain");
            setDynamicAspectRatio(width / height); // 👈 ej: 16/9
          } else {
            // Video vertical o cuadrado: mantiene el ratio del prop
            setDynamicContentFit("cover");
            setDynamicAspectRatio(aspectRatio); // 👈 restaura el original
          }
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [player, aspectRatio]);

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
      <View style={[styles.container, { width: "100%", aspectRatio: dynamicAspectRatio }]}>
        {player && (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit={"contain"}
            nativeControls={false}
          />
        )}

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
