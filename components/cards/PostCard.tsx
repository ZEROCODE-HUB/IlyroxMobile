/**
 * PostCard - Tarjeta de post para el feed
 * ACTUALIZADO: Usa hooks reales para likes y share
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { FeedItem, User } from "../../types";
import { useFeedInteractions, useViewTracking } from "../../hooks";
import { DIMENSIONS, COLORS } from "../../constants";
import { commonStyles } from "../../styles";
import { UserHeader, ImageGallery, ReportModal } from "../shared";
import ActionButtons from "../ActionButtons";

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

  const images = item.images || [];
  const hasImages = images.length > 0;
  const isShortContent = item.content.length < 100;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={commonStyles.card}
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
      />

      {/* Imágenes o Contenido de Texto */}
      <View style={styles.contentContainer}>
        {!hasImages ? (
          <View
            style={[
              styles.textPostContainer,
              isShortContent && styles.textPostGradient,
            ]}
          >
            <Text
              style={
                isShortContent ? styles.textPostLarge : styles.textPostNormal
              }
            >
              {item.content}
            </Text>
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
        />
      </View>

      {/* Descripción del post (solo si tiene imágenes) */}
      {hasImages && (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            <Text style={styles.captionUser}>
              {item.user.nombre || item.user.name}
            </Text>
            {item.content}
          </Text>
        </View>
      )}

      {/* Modal de reporte */}
      <ReportModal
        visible={showReportModal}
        reportType="post"
        onClose={() => setShowReportModal(false)}
        onReport={handleReport}
      />
    </TouchableOpacity>
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
  actionsContainer: {
    paddingHorizontal: 12,
    width: "100%",
    backgroundColor: COLORS.white,
    paddingVertical: 4,
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
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});

export default React.memo(PostCard);
