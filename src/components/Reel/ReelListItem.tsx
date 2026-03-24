import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Pressable,
} from "react-native";
import { VideoView, useVideoPlayer as useExpoVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { FeedItem, User } from "../../types";
import { COLORS } from "../../constants";
import CommentsBottomSheet from "../modals/CommentsBottomSheet";
import ActionButtons from "../ActionButtons";
import { Avatar } from "../shared";

// ─── Sub-component: owns the native player lifecycle ─────────────────────────
// Mounting this component creates the player; unmounting releases it cleanly.
// This is the ONLY correct way to avoid "shared object already released" with
// expo-video: the VideoView and useVideoPlayer hook MUST share the same
// component mount/unmount cycle.

interface ReelVideoPlayerProps {
  videoSource: string;
  isActive: boolean;
  width: number;
  height: number;
  onPlayingChange: (playing: boolean) => void;
  onProgressChange: (progress: number) => void;
  onReadyChange: (ready: boolean) => void;
  toggleRef: React.MutableRefObject<() => void>;
}

const ReelVideoPlayer: React.FC<ReelVideoPlayerProps> = ({
  videoSource,
  isActive,
  width,
  height,
  onPlayingChange,
  onProgressChange,
  onReadyChange,
  toggleRef,
}) => {
  const [isReady, setIsReady] = useState(false);

  const player = useExpoVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = false;
    if (isActive) p.play();
  });

  // Sync play/pause with visibility
  React.useEffect(() => {
    if (!player) return;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  // Poll status, progress and playing state
  React.useEffect(() => {
    const interval = setInterval(() => {
      try {
        if (!player) return;
        onPlayingChange(player.playing);
        const ready = player.status === "readyToPlay";
        setIsReady(ready);
        onReadyChange(ready);
        if (player.duration > 0) {
          onProgressChange(
            Math.min(1, Math.max(0, player.currentTime / player.duration)),
          );
        }
      } catch {
        // player released — interval will be cleared on unmount
      }
    }, 100);
    return () => clearInterval(interval);
  }, [player, onPlayingChange, onProgressChange, onReadyChange]);

  // Expose togglePlayPause to parent via ref
  React.useEffect(() => {
    toggleRef.current = () => {
      try {
        if (!player) return;
        if (player.playing) {
          player.pause();
        } else {
          player.play();
        }
      } catch {
        // ignore released errors
      }
    };
    return () => {
      toggleRef.current = () => {};
    };
  }, [player, toggleRef]);

  return (
    <VideoView
      player={player}
      style={[StyleSheet.absoluteFill, { opacity: isReady ? 1 : 0 }]}
      contentFit="contain"
      nativeControls={false}
    />
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface ReelListItemProps {
  item: FeedItem;
  isActive: boolean;
  shouldInitialize: boolean;
  onClose: () => void;
  onUserClick?: (user: User) => void;
  currentUserId?: string;
}

const ReelListItem: React.FC<ReelListItemProps> = ({
  item,
  isActive,
  shouldInitialize,
  onClose,
  onUserClick,
  currentUserId,
}) => {
  const { width, height } = useWindowDimensions();
  const [showComments, setShowComments] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [isPlaying, setIsPlaying] = useState(isActive);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [progress, setProgress] = useState(0);

  // togglePlayPause is wired up by ReelVideoPlayer via this ref
  const toggleRef = React.useRef<() => void>(() => {});
  const handleToggle = useCallback(() => toggleRef.current(), []);

  const videoSource =
    item.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4";
  const SAFE_BOTTOM = Platform.OS === "ios" ? 34 : 20;

  const handlePlayingChange = useCallback((v: boolean) => setIsPlaying(v), []);
  const handleProgressChange = useCallback((v: number) => setProgress(v), []);
  const handleReadyChange = useCallback((v: boolean) => setIsVideoReady(v), []);

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={[styles.video, { width, height }]}>
        {/* Thumbnail — always visible while buffering */}
        {item.images && item.images.length > 0 && item.images[0] ? (
          <Image
            source={{ uri: item.images[0] }}
            style={[StyleSheet.absoluteFill, { width, height }]}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholder} />
        )}

        {/* Video player only mounts when this item is in the ±1 window.
            Unmounting it releases the native player safely BEFORE expo-video
            can tear it down from the other side. */}
        {shouldInitialize && (
          <ReelVideoPlayer
            videoSource={videoSource}
            isActive={isActive}
            width={width}
            height={height}
            onPlayingChange={handlePlayingChange}
            onProgressChange={handleProgressChange}
            onReadyChange={handleReadyChange}
            toggleRef={toggleRef}
          />
        )}
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={handleToggle} />

        <TouchableOpacity
          onPress={onClose}
          style={[styles.backButton, { top: Platform.OS === "ios" ? 54 : 54 }]}
        >
          <Ionicons name="chevron-back" size={28} color={COLORS.white} />
        </TouchableOpacity>

        {!isPlaying && isActive && shouldInitialize && isVideoReady && (
          <Pressable
            style={styles.playIndicator}
            onPress={handleToggle}
            pointerEvents="none"
          >
            <View style={styles.playIconContainer}>
              <View style={styles.playIcon} />
            </View>
          </Pressable>
        )}

        <View style={[styles.bottomUI, { bottom: SAFE_BOTTOM }]}>
          <View style={styles.timelineTrack}>
            <View
              style={[
                styles.timelineFill,
                { width: `${Math.round((progress || 0) * 100)}%` },
              ]}
            />
          </View>

          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => onUserClick?.(item.user)}
          >
            {item.user.avatar ? (
              <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
            ) : (
              <Avatar name={item.user.name} size={40} />
            )}
            <View style={styles.userTextContainer}>
              <Text style={styles.userName}>
                {item.user.name || item.user.nombre || "Usuario"}
              </Text>
            </View>
          </TouchableOpacity>

          {item.content && (
            <TouchableOpacity
              style={styles.contentContainer}
              onPress={() => setShowFullCaption(!showFullCaption)}
            >
              <Text
                style={[
                  styles.content,
                  showFullCaption && styles.contentExpanded,
                ]}
                numberOfLines={showFullCaption ? undefined : 3}
              >
                {item.content}
              </Text>
              {item.content.length > 100 && (
                <Text style={styles.seeMoreText}>
                  {showFullCaption ? "Ver menos" : "Ver más"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.actionsContainer, { bottom: SAFE_BOTTOM + 120 }]}>
          <ActionButtons
            feedItemId={item.id}
            feedItemType="reel"
            initialLikes={item.likes}
            comments={item.comments}
            userId={currentUserId}
            onCommentClick={() => setShowComments(true)}
            orientation="vertical"
            tintColor={COLORS.white}
            shareTitle={"Mira este reel"}
            shareDescription={item.content}
            shareImageUrl={item.images?.[0]}
            authorId={item.user.id}
            contentId={item.reelDetails?.id}
          />
        </View>
      </View>

      <CommentsBottomSheet
        visible={showComments}
        onClose={() => setShowComments(false)}
        feedItemId={item.id}
        currentUserId={currentUserId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.black,
    overflow: "hidden",
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.black,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  backButton: {
    position: "absolute",
    left: 12,
    zIndex: 20,
    backgroundColor: COLORS.blackTransparent60,
    borderRadius: 20,
    padding: 8,
  },
  playIndicator: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  playIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.blackTransparent50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.whiteTransparent50,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderLeftColor: COLORS.white,
    borderTopWidth: 14,
    borderTopColor: "transparent",
    borderBottomWidth: 14,
    borderBottomColor: "transparent",
    marginLeft: 6,
  },
  bottomUI: {
    position: "absolute",
    left: 12,
    right: 80,
  },
  timelineTrack: {
    height: 2,
    backgroundColor: COLORS.whiteTransparent30,
    borderRadius: 1,
    marginBottom: 12,
  },
  timelineFill: {
    height: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 1,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
    textShadowColor: COLORS.blackTransparent80,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  content: {
    color: COLORS.whiteTransparent95,
    fontSize: 14,
    lineHeight: 18,
    textShadowColor: COLORS.blackTransparent80,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionsContainer: {
    position: "absolute",
    right: 10,
    alignItems: "center",
  },
  contentContainer: {
    marginTop: 10,
  },
  seeMoreText: {
    color: COLORS.whiteTransparent50,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  contentExpanded: {
    backgroundColor: COLORS.blackTransparent,
    borderRadius: 10,
    padding: 10,
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.black,
  },
});

export default React.memo(ReelListItem);
