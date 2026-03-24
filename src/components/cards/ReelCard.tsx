/**
 * ReelCard - Tarjeta de reel para el feed
 * ACTUALIZADO: Usa hooks reales para likes y share
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  FlatList,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FeedItem, User } from "../../types";
import { useFeedInteractions, useViewTracking } from "@/hooks/hooks";
import { DIMENSIONS, COLORS } from "../../constants";
import { commonStyles } from "../../../styles";
import { UserHeader, VideoPlayer, Avatar } from "../shared";
import ActionButtons from "../ActionButtons";
// import { supabase } from "../../lib/supabase";
import { useUserRecommendations } from "@/hooks/hooks/useUserRecommendations";
import RecommendedUsersModal from "../modals/RecommendedUsersModal";
import { useApp } from "../../context/AppContext";

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
  const { isGlobalMuted: isMuted, setIsGlobalMuted: setIsMuted } = useApp();

  const positiveRecommendations = item.user.positiveRecommendations ?? 0;
  const recommendedByPreview = item.user.recommendedByPreview ?? [];
  const firstRecommender = recommendedByPreview[0];
  const recommendedText =
    positiveRecommendations > 0 && firstRecommender
      ? `${firstRecommender.name}${
          positiveRecommendations > 1
            ? ` y ${positiveRecommendations - 1} más`
            : ""
        }`
      : `Recomendado por ${positiveRecommendations} usuarios`;
  const [showRecommendedModal, setShowRecommendedModal] = React.useState(false);

  const [showFullCaption, setShowFullCaption] = React.useState(false);

  const { recommendedList, loadingRecommended, fetchRecommendations } =
    useUserRecommendations(item.user.id);

  const openRecommendedModal = async () => {
    setShowRecommendedModal(true);
    fetchRecommendations();
  };

  const handleExpand = () => {
    setIsMuted(true); // Silenciar globalmente (afecta a las tarjetas del feed)
    onClick();
  };

  const handleSeeMore = () => {
    setShowFullCaption(!showFullCaption);
  };

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
        showRecommendedPreview={false}
      />
      {positiveRecommendations > 0 && (
        <Pressable style={styles.recommendedRow} onPress={openRecommendedModal}>
          <View style={styles.recommendedAvatars}>
            {recommendedByPreview.slice(0, 2).map((u, idx) => (
              <View
                key={`${u.id}-${idx}`}
                style={[
                  styles.recommendedAvatarWrapper,
                  idx > 0 && styles.recommendedAvatarOverlap,
                ]}
              >
                <Avatar
                  uri={u.avatar || undefined}
                  name={u.name}
                  size={18}
                  style={{ borderWidth: 1, borderColor: COLORS.white }}
                />
              </View>
            ))}
          </View>
          <Text style={styles.recommendedText} numberOfLines={1}>
            {recommendedText}
          </Text>
        </Pressable>
      )}

      {/* Video Player */}
      <View style={styles.reelContainer}>
        <VideoPlayer
          videoUrl={item.videoUrl || ""}
          isVisible={isVisible}
          aspectRatio={DIMENSIONS.REEL_ASPECT_RATIO}
          contentFit="cover"
          showTimeline={true}
          showPlayIcon={true}
          isMuted={isMuted}
        />

        {/* Badge de Reel */}
        <View style={styles.reelBadge}>
          <Ionicons name="videocam" size={10} color={COLORS.white} />
          <Text style={styles.reelBadgeText}>Reel</Text>
        </View>

        {/* Botón para expandir */}
        <Pressable style={styles.expandButton} onPress={handleExpand}>
          <Ionicons name="expand" size={18} color={COLORS.white} />
        </Pressable>
        <View style={styles.previewOverlayControls}>
          <Pressable
            onPress={() => setIsMuted(!isMuted)}
            style={styles.controlIconBadge}
          >
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-high"}
              size={20}
              color={COLORS.white}
            />
          </Pressable>
        </View>
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
          contentId={item.reelDetails?.id}
        />
      </View>

      {/* Descripción del reel - Estilo Instagram */}
      {item.content && (
        <Pressable style={styles.captionContainer} onPress={handleSeeMore}>
          <Text style={styles.captionText}>
            <Text style={styles.captionUser}>
              {item.user.nombre || item.user.name}
            </Text>
            {" " +
              (item.content.length > 100
                ? item.content.substring(0, 100)
                : item.content)}
            {!showFullCaption && item.content.length > 100 && (
              <Text style={styles.seeMoreText}>... más</Text>
            )}
            {showFullCaption && (
              <Text style={styles.captionText}>
                {item.content.substring(100)}
              </Text>
            )}
          </Text>
        </Pressable>
      )}
      <RecommendedUsersModal
        visible={showRecommendedModal}
        onClose={() => setShowRecommendedModal(false)}
        loading={loadingRecommended}
        users={recommendedList}
        totalCount={positiveRecommendations}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  reelContainer: {
    width: "100%",
    aspectRatio: DIMENSIONS.REEL_ASPECT_RATIO,
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
  recommendedRow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
  },
  recommendedAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  recommendedAvatarWrapper: {
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  recommendedAvatarOverlap: {
    marginLeft: -8,
  },
  recommendedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    maxWidth: 220,
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
  recommendedModal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    width: 320,
    maxHeight: 420,
  },
  recommendedModalHeader: {
    alignItems: "center",
    paddingBottom: 8,
  },
  recommendedModalTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedModalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recommendedModalLoading: {
    padding: 16,
    alignItems: "center",
  },
  recommendedModalList: {
    paddingVertical: 6,
  },
  recommendedModalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  recommendedModalInfo: {
    flex: 1,
  },
  recommendedModalName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  recommendedModalRole: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  recommendedModalEmpty: {
    padding: 16,
    alignItems: "center",
  },
  recommendedModalEmptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  previewOverlayControls: {
    position: "absolute",
    bottom: 20,
    right: 12,
    zIndex: 20,
  },
  controlIconBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 20,
  },
  seeMoreText: {
    color: COLORS.primaryDark,
    fontWeight: "700",
  },
});

export default React.memo(ReelCard);
