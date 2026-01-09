/**
 * ActionButtons - Botones de acción con funcionalidad real
 *
 * FEATURES:
 * - Likes con optimistic updates (useLikes hook)
 * - Share con deep linking (useShare hook)
 * - Integración completa con Supabase
 */

import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLikes, useShare } from "../hooks";
import { COLORS } from "../constants";

interface ActionButtonsProps {
  feedItemId: string;
  feedItemType: "post" | "reel" | "property";
  initialLikes: number;
  comments: number;
  userId?: string;
  onCommentClick: () => void;
  shareTitle?: string;
  shareDescription?: string;
  shareImageUrl?: string;
  showContactButton?: boolean;
  fetchCount?: boolean;
  orientation?: "horizontal" | "vertical";
  tintColor?: string;
  onTrackInteraction?: (
    type: "like" | "comentario" | "compartir" | "guardar"
  ) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  feedItemId,
  feedItemType,
  initialLikes,
  comments,
  userId,
  onCommentClick,
  shareTitle = "Check this out!",
  shareDescription = "",
  shareImageUrl,
  showContactButton = false,
  fetchCount = false,
  orientation = "horizontal",
  tintColor = COLORS.textPrimary,
  onTrackInteraction,
}) => {
  // Hook de likes con optimistic updates
  const { likes, isLiked, toggleLike } = useLikes({
    feedItemId,
    initialLikes,
    userId,
    onLikeSuccess: () => onTrackInteraction?.("like"), // ⬅️ AGREGAR
  });

  // Hook de compartir con deep linking
  const { shareContent } = useShare();
  const handleShare = async () => {
    const success = await shareContent({
      feedItemId,
      type: feedItemType,
      title: shareTitle,
      description: shareDescription,
      imageUrl: shareImageUrl,
    });

    if (success) {
      Alert.alert("¡Compartido!", "Contenido compartido exitosamente");
    }
  };

  const isVertical = orientation === "vertical";
  const containerStyle = isVertical ? styles.actionColumn : styles.actionRow;
  const leftStyle = isVertical ? styles.actionLeftVertical : styles.actionLeft;
  const itemStyle = isVertical
    ? styles.iconWithCountVertical
    : styles.iconWithCount;
  const textColor = tintColor;

  return (
    <View style={containerStyle}>
      <View style={leftStyle}>
        {/* Like Button */}
        <TouchableOpacity
          onPress={toggleLike}
          style={itemStyle}
          accessibilityLabel={isLiked ? "Quitar me gusta" : "Dar me gusta"}
          accessibilityRole="button"
          disabled={!userId}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={isVertical ? 28 : 20}
            color={isLiked ? COLORS.error : tintColor}
          />
          <Text style={[styles.iconCountText, { color: textColor }]}>
            {likes}
          </Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity
          onPress={onCommentClick}
          style={itemStyle}
          accessibilityLabel="Comentar publicación"
          accessibilityRole="button"
        >
          <Ionicons
            name="chatbubble-outline"
            size={isVertical ? 26 : 20}
            color={tintColor}
          />
          <Text style={[styles.iconCountText, { color: textColor }]}>
            {comments}
          </Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity
          onPress={handleShare}
          style={itemStyle}
          accessibilityLabel="Compartir publicación"
          accessibilityRole="button"
        >
          <Ionicons
            name="share-social"
            size={isVertical ? 26 : 20}
            color={tintColor}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.actionRight}>
        {showContactButton && !isVertical && (
          <TouchableOpacity
            style={styles.smallContactBtn}
            accessibilityLabel="Contactar asesor"
            accessibilityRole="button"
          >
            <Ionicons name="call" size={16} color={COLORS.white} />
            <Text style={styles.smallContactText}>Contactar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginTop: 4,
    paddingVertical: 8,
  },
  actionColumn: {
    flexDirection: "column",
    alignItems: "center",
  },
  actionLeft: {
    flexDirection: "row",
    gap: 16,
  },
  actionLeftVertical: {
    flexDirection: "column",
    gap: 16,
    alignItems: "center",
  },
  actionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWithCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  iconWithCountVertical: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: 50,
  },
  iconCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  smallContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  smallContactText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
});

export default React.memo(ActionButtons);
