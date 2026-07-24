import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Modal,
  Animated,
  PanResponder,
  StatusBar,
  Platform,
  Pressable,
} from "react-native";
import { VideoView, useVideoPlayer as useExpoVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { FeedItem, User } from "../../types";
import { COLORS, FALLBACKS } from "../../constants";
import CommentsBottomSheet from "../modals/CommentsBottomSheet";
import ActionButtons from "../ActionButtons";
import { Avatar } from "../shared";

interface ReelDetailProps {
  item: FeedItem;
  onClose: () => void;
  onUserClick?: (user: User) => void;
  currentUserId?: string;
}

const ReelDetail: React.FC<ReelDetailProps> = ({
  item,
  onClose,
  onUserClick,
  currentUserId,
}) => {
  const { width, height } = useWindowDimensions();
  const [showComments, setShowComments] = useState(false);

  const videoSource =
    item.videoUrl || FALLBACKS.VIDEO_URL;

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const player = useExpoVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  const togglePlayPause = useCallback(() => {
    try {
      if (!player) return;
      if (player.playing) { player.pause(); } else { player.play(); }
    } catch { /* ignore released */ }
  }, [player]);

  // Poll status
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        if (!player) return;
        setIsPlaying(player.playing);
        setIsVideoReady(player.status === "readyToPlay");
        if (player.duration > 0) {
          setProgress(Math.min(1, Math.max(0, player.currentTime / player.duration)));
        }
      } catch { /* ignore */ }
    }, 100);
    return () => clearInterval(interval);
  }, [player]);

  // Referencia para evitar swipe cuando hay comentarios abiertos
  const showCommentsRef = useRef(false);
  useEffect(() => {
    showCommentsRef.current = showComments;
  }, [showComments]);

  // Animación para swipe down to close
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Solo permitir swipe si no hay comentarios abiertos
        return !showCommentsRef.current && Math.abs(gestureState.dy) > 15;
      },
      onPanResponderMove: (_, gestureState) => {
        // Solo permitir swipe hacia abajo
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Si el swipe es suficiente, cerrar
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          Animated.timing(panY, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            panY.setValue(0);
            onClose();
          });
        } else {
          // Si no, volver a posición original
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
        }
      },
    }),
  ).current;

  const SAFE_BOTTOM = Platform.OS === "ios" ? 34 : 20;

  const [showFullCaption, setShowFullCaption] = useState(false);

  const handleShowMore = () => {
    setShowFullCaption(!showFullCaption);
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      supportedOrientations={["portrait"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <Animated.View
        style={[
          styles.container,
          {
            width,
            height,
            transform: [{ translateY: panY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.video, { width, height }]}>
          {/* Placeholder Image (Thumbnail) */}
          {item.images && item.images.length > 0 && item.images[0] ? (
            <Image
              source={{ uri: item.images[0] }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}

          {/* VIDEO - Pantalla completa manteniendo aspect ratio */}
          <VideoView
            player={player}
            style={[StyleSheet.absoluteFill, { opacity: isVideoReady ? 1 : 0 }]}
            contentFit="contain"
            nativeControls={false}
          />
        </View>

        {/* OVERLAY - UI Elements al estilo TikTok */}
        <View style={styles.overlay} pointerEvents="box-none">
          {/* Pressable invisible que cubre todo el fondo para play/pause */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={togglePlayPause}
          />

          {/* Botón cerrar (top left) */}
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.backButton,
              { top: Platform.OS === "ios" ? 54 : 40 },
            ]}
          >
            <Ionicons name="chevron-back" size={28} color={COLORS.white} />
          </TouchableOpacity>

          {/* Play indicator (center) */}
          {!isPlaying && (
            <Pressable
              style={styles.playIndicator}
              onPress={togglePlayPause}
              pointerEvents="none"
            >
              <View style={styles.playIconContainer}>
                <View style={styles.playIcon} />
              </View>
            </Pressable>
          )}

          {/* Bottom UI - Información del usuario (estilo TikTok) */}
          <View style={[styles.bottomUI, { bottom: SAFE_BOTTOM }]}>
            {/* Timeline de progreso */}
            <View style={styles.timelineTrack}>
              <View
                style={[
                  styles.timelineFill,
                  { width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>

            {/* User info - Bottom left (estilo TikTok) */}
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => onUserClick?.(item.user)}
            >
              {item.user.avatar ? (
                <Image
                  source={{ uri: item.user.avatar }}
                  style={styles.avatar}
                />
              ) : (
                <Avatar name={item.user.name} size={10} />
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
                onPress={handleShowMore}
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

          {/* Actions - Botones verticales derecha (estilo TikTok) */}
          <View
            style={[styles.actionsContainer, { bottom: SAFE_BOTTOM + 120 }]}
          >
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
              contentId={
                item.reelDetails?.id ||
                (item.type === "reel" ? item.id : undefined)
              }
              initialShares={item.shares}
            />
          </View>
        </View>

        {/* Comments Modal */}
        <CommentsBottomSheet
          visible={showComments}
          onClose={() => setShowComments(false)}
          feedItemId={item.id}
          currentUserId={currentUserId}
        />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.black,
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.black,
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
    right: 80, // Espacio para los botones de acción
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
  // Actions Container - Estilo TikTok (vertical right)
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
});

export default React.memo(ReelDetail);
