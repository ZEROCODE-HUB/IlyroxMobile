/**
 * ReelDetail - Vista de reel en pantalla completa al estilo TikTok
 *
 * CARACTERÍSTICAS ESTILO TIKTOK:
 * - Video en pantalla completa vertical
 * - Swipe down para cerrar
 * - UI overlay con información del usuario en la parte inferior izquierda
 * - Botones de acción verticales en la parte inferior derecha (like, comment, share)
 * - Timeline de progreso
 * - StatusBar translúcido
 *
 * MEJORAS IMPLEMENTADAS:
 * - Usa useVideoPlayer hook para el control de video
 * - Usa COLORS y DIMENSIONS para consistencia
 * - Código más limpio y organizado
 *
 * MIGRADO A EXPO-VIDEO desde expo-av
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  useWindowDimensions,
  Modal,
  Share,
  Animated,
  PanResponder,
  StatusBar,
  Platform,
} from "react-native";
import { VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { FeedItem, User } from "../../types";
import { useVideoPlayer, useLikes, useShare } from "../../hooks";
import { COLORS } from "../../constants";
import CommentsBottomSheet from "../modals/CommentsBottomSheet";

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
  console.log(item);
  const { width, height } = useWindowDimensions();
  const { likes, isLiked, toggleLike } = useLikes({
    feedItemId: item.id,
    initialLikes: item.likes,
    userId: currentUserId,
  });
  const [showComments, setShowComments] = useState(false);

  // Video de fallback si no hay URL
  const videoSource =
    item.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4";

  // Hook de video player con auto-play
  const { player, isPlaying, progress, togglePlayPause } = useVideoPlayer({
    videoSource,
    isVisible: true,
    autoPlay: true,
    muted: false,
  });

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
    })
  ).current;

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this reel: ${item.content}`,
      });
    } catch (error) {
      console.warn("Error sharing:", error);
    }
  }, [item.content]);

  const SAFE_BOTTOM = Platform.OS === "ios" ? 34 : 20;

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
        <TouchableWithoutFeedback onPress={togglePlayPause}>
          <View style={[styles.video, { width, height }]}>
            {/* VIDEO - Pantalla completa manteniendo aspect ratio */}
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              nativeControls={false}
            />
          </View>
        </TouchableWithoutFeedback>

        {/* OVERLAY - UI Elements al estilo TikTok */}
        <View style={styles.overlay} pointerEvents="box-none">
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
            <View style={styles.playIndicator} pointerEvents="none">
              <View style={styles.playIconContainer}>
                <View style={styles.playIcon} />
              </View>
            </View>
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
              <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
              <View style={styles.userTextContainer}>
                <Text style={styles.userName}>
                  {item.user.name || item.user.nombre || "Usuario"}
                </Text>
                {item.content && (
                  <Text style={styles.content} numberOfLines={3}>
                    {item.content}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Actions - Botones verticales derecha (estilo TikTok) */}
          <View style={[styles.actionsContainer, { bottom: SAFE_BOTTOM + 60 }]}>
            {/* Like button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={toggleLike}
              disabled={!currentUserId}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons
                  name={isLiked ? "heart" : "heart-outline"}
                  size={32}
                  color={isLiked ? COLORS.error : COLORS.white}
                />
              </View>
              <Text style={styles.actionText}>{likes}</Text>
            </TouchableOpacity>

            {/* Comment button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowComments(true)}
            >
              <View style={styles.actionIconContainer}>
                <Ionicons
                  name="chatbubble-outline"
                  size={30}
                  color={COLORS.white}
                />
              </View>
              <Text style={styles.actionText}>{item.comments}</Text>
            </TouchableOpacity>

            {/* Share button */}
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <View style={styles.actionIconContainer}>
                <Ionicons
                  name="share-social-outline"
                  size={28}
                  color={COLORS.white}
                />
              </View>
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
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
  // Bottom UI - Estilo TikTok
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
    gap: 20,
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    // Se eliminó la sombra y elevación según solicitud del usuario
    elevation: 0,
  },
  actionText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: COLORS.blackTransparent80,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

export default React.memo(ReelDetail);
