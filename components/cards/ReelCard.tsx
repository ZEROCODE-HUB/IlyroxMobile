/**
 * ReelCard - Tarjeta de reel para el feed
 * ACTUALIZADO: Usa hooks reales para likes y share
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FeedItem, User } from "../../types";
import { useFeedInteractions, useViewTracking } from "../../hooks";
import { DIMENSIONS, COLORS } from "../../constants";
import { commonStyles } from "../../styles";
import { UserHeader, VideoPlayer } from "../shared";
import ActionButtons from "../ActionButtons";

interface ReelCardProps {
  item: FeedItem;
  onClick: () => void;
  onUserClick?: (user: User) => void;
  onCommentClick: () => void;
  isVisible?: boolean;
  currentUserId?: string;
}

const ReelCard: React.FC<ReelCardProps> = ({
  item,
  onClick,
  onUserClick,
  onCommentClick,
  isVisible = false,
  currentUserId,
}) => {
  const { showOptions, showReportModal, setShowOptions, setShowReportModal } =
    useFeedInteractions();
  // Hook de view tracking
  const { trackInteraction } = useViewTracking({
    feedItemId: item.id,
    userId: currentUserId,
    isVisible: isVisible, // ReelCard ya tiene este prop
  });

  return (
    <View style={commonStyles.card}>
      <UserHeader
        user={item.user}
        timestamp={item.timestamp}
        onUserClick={onUserClick}
        showOptions={showOptions}
        setShowOptions={setShowOptions}
        onReport={() => setShowReportModal(true)}
        totalRatings={item.user.totalRatings}
      />

      {/* Video Player */}
      <View style={styles.reelContainer}>
        <VideoPlayer
          videoUrl={item.videoUrl || ""}
          isVisible={isVisible}
          aspectRatio={1}
          showTimeline={true}
          showPlayIcon={true}
        />

        {/* Badge de Reel */}
        <View style={styles.reelBadge}>
          <Ionicons name="videocam" size={10} color={COLORS.white} />
          <Text style={styles.reelBadgeText}>Reel</Text>
        </View>

        {/* Botón para expandir */}
        <TouchableOpacity
          style={styles.expandButton}
          onPress={onClick}
          activeOpacity={0.7}
        >
          <Ionicons name="expand" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Botones de acción - Estilo Instagram */}
      <View style={styles.actionsContainer}>
        <ActionButtons
          feedItemId={item.id}
          feedItemType="reel"
          initialLikes={item.likes}
          comments={item.comments}
          userId={currentUserId}
          onCommentClick={() => {
            trackInteraction("comentario");
            onCommentClick();
          }}
          onTrackInteraction={trackInteraction}
          shareTitle={`Reel de ${item.user.nombre || item.user.name}`}
          shareDescription={item.content || "Mira este reel"}
          orientation="horizontal"
        />
      </View>

      {/* Descripción del reel - Estilo Instagram */}
      {item.content && (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            <Text style={styles.captionUser}>
              {item.user.nombre + ": " || item.user.name + ": "}
            </Text>
            {item.content}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  reelContainer: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
  },
  actionsContainer: {
    paddingHorizontal: 4,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  captionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  captionUser: {
    fontWeight: "bold",
  },
  reelBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: COLORS.blackTransparent60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DIMENSIONS.BORDER_RADIUS_SMALL,
    gap: 4,
    zIndex: 10,
  },
  reelBadgeText: {
    ...commonStyles.badgeText,
  },
  expandButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: COLORS.blackTransparent60,
    padding: 8,
    borderRadius: 8,
    zIndex: 10,
  },
});

export default React.memo(ReelCard);
