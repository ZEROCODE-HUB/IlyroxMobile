/**
 * PostCard - Tarjeta de post para el feed
 * ACTUALIZADO: Usa hooks reales para likes y share
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FeedItem, User } from "../../types";

import { DIMENSIONS, COLORS } from "../../constants";
import { commonStyles } from "../../../styles";
import {
  UserHeader,
  ImageGallery,
  ReportModal,
  Avatar,
  RichText,
} from "../shared";
import ActionButtons from "../ActionButtons";

import RecommendedUsersModal from "../modals/RecommendedUsersModal";
import { useFeedInteractions, useViewTracking } from "@/hooks/hooks";
import { useUserRecommendations } from "@/hooks/hooks/useUserRecommendations";
import { SpecialPostCard } from "../Feed/SpecialPostCard";

interface PostCardProps {
  item: FeedItem;
  onClick: () => void;
  onUserClick?: (user: User) => void;
  onCommentClick: () => void;
  currentUserId?: string;
}

const PostCard: React.FC<PostCardProps> = ({
  item,
  onClick,
  onUserClick,
  onCommentClick,
  currentUserId,
}) => {
  // Hook de interacciones (reportes, opciones)
  const {
    showOptions,
    showReportModal,
    setShowOptions,
    setShowReportModal,
    handleReport,
  } = useFeedInteractions();

  // Hook de view tracking
  const { trackInteraction } = useViewTracking({
    feedItemId: item.id,
    userId: currentUserId,
    isVisible: true,
  });
  const isSpecialPost =
    ["openhouse", "aniversario", "sold"].includes(item.postType) ||
    (item.postType === "busqueda" && !!item.postDetails?.busquedas_json);

  const images = item.images || [];
  const hasImages = images.length > 0;
  const isOpenHouse = item.postType === "openhouse";
  const isAniversary = item.postType === "aniversario";
  const isSold = item.postType === "sold";
  const isSearchPost = item.postType === "busqueda";
  const isShortContent = item.content.length < 100;
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

  const handleSeeMore = () => {
    setShowFullCaption(!showFullCaption);
  };

  return (
    <View style={commonStyles.card}>
      <TouchableOpacity
        activeOpacity={0.95}
        style={styles.contentCard}
        onPress={onClick}
      >
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
          <TouchableOpacity
            style={styles.recommendedRow}
            onPress={openRecommendedModal}
            activeOpacity={0.85}
          >
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
          </TouchableOpacity>
        )}
        {/* Imágenes o Contenido de Texto */}
        <View style={styles.contentContainer}>
          {isSpecialPost ? (
            <SpecialPostCard item={item} mode="preview" />
          ) : !hasImages ? (
            <View
              style={[
                styles.textPostContainer,
                isShortContent && styles.textPostGradient,
                isSearchPost && commonStyles.cardDetail,
              ]}
            >
              <RichText
                style={[
                  isShortContent ? styles.textPostLarge : styles.textPostNormal,
                  isSearchPost && commonStyles.textDetail,
                  isOpenHouse && commonStyles.textDetail,
                  isAniversary && commonStyles.textDetail,
                  isSold && commonStyles.textDetail,
                ]}
                content={item.content}
                iconSize={isSearchPost ? 18 : 16}
                iconColor={
                  isSearchPost ? COLORS.primaryDark : COLORS.textPrimary
                }
              />
            </View>
          ) : (
            <ImageGallery
              images={images}
              aspectRatio={DIMENSIONS.POST_ASPECT_RATIO}
              showDots={true}
              showImageCount={false}
            />
          )}
        </View>

        {/* Botones de acción - Estilo Instagram */}
        <View style={styles.actionsContainer}>
          <ActionButtons
            feedItemId={item.id}
            feedItemType="post"
            initialLikes={item.likes}
            comments={item.comments}
            userId={currentUserId}
            onCommentClick={() => {
              trackInteraction("comentario");
              onCommentClick();
            }}
            onTrackInteraction={trackInteraction}
            shareTitle={`Post de ${item.user.nombre || item.user.name}`}
            shareDescription={item.content.substring(0, 100)}
            shareImageUrl={hasImages ? images[0] : undefined}
            orientation="horizontal"
            authorId={item.user.id}
            contentId={item.postDetails?.id}
          />
        </View>

        {/* Descripción del post (solo si tiene imágenes) */}

        {/* Modal de reporte */}
        <ReportModal
          visible={showReportModal}
          reportType="post"
          onClose={() => setShowReportModal(false)}
          onReport={handleReport}
        />
        <RecommendedUsersModal
          visible={showRecommendedModal}
          onClose={() => setShowRecommendedModal(false)}
          loading={loadingRecommended}
          users={recommendedList}
          totalCount={positiveRecommendations}
        />
      </TouchableOpacity>
      {hasImages && (
        <TouchableOpacity
          style={styles.captionContainer}
          onPress={handleSeeMore}
        >
          <Text style={styles.captionText}>
            <Text style={styles.captionUser}>
              {item.user.nombre || item.user.name}
            </Text>
            {" " + item.content.substring(0, 100)}
            {!showFullCaption && (
              <Text style={styles.seeMoreText}>... más</Text>
            )}
            {showFullCaption && (
              <Text style={styles.captionText}>
                {item.content.substring(100)}
              </Text>
            )}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    width: "100%",
    backgroundColor: COLORS.white,
  },
  contentContainer: {
    width: "100%",
    backgroundColor: COLORS.white,
  },
  contentCard: {
    backgroundColor: COLORS.white,
    marginBottom: 2,
  },
  actionsContainer: {
    paddingHorizontal: 12,
    width: "100%",
    backgroundColor: COLORS.white,
    paddingVertical: 4,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  captionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  captionUser: {
    fontWeight: "bold",
  },
  textPostContainer: {
    padding: 20,
    minHeight: 120,
    justifyContent: "center",
  },
  textPostGradient: {
    backgroundColor: COLORS.gradientBackground,
    alignItems: "center",
    minHeight: 200,
  },
  textPostLarge: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  textPostNormal: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 22,
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
  searchPostContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginHorizontal: 12,
    marginVertical: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
    paddingBottom: 8,
  },
  searchTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primaryDark,
    letterSpacing: 1,
  },
  searchInfoContent: {
    gap: 10,
  },
  searchMainRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  searchBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  searchLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  searchLocationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  searchPriceRow: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 10,
  },
  searchPriceText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  searchCharacteristicsGrid: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 4,
  },
  searchCharItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  searchCharText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  seeMoreText: {
    color: COLORS.primaryDark,
    fontWeight: "700",
  },
});

export default React.memo(PostCard);
