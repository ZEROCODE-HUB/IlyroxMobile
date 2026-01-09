/**
 * PostCard - Tarjeta de post para el feed
 * ACTUALIZADO: Usa hooks reales para likes y share
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { FeedItem, User } from "../../types";
import { useFeedInteractions, useViewTracking } from "../../hooks";
import { DIMENSIONS, COLORS } from "../../constants";
import { commonStyles } from "../../styles";
import { UserHeader, ImageGallery, ReportModal, Avatar } from "../shared";
import ActionButtons from "../ActionButtons";
import { supabase } from "../../lib/supabase";

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
  const [recommendedList, setRecommendedList] = React.useState<
    { id: string; name: string; role?: string; avatar?: string | null }[]
  >([]);
  const [loadingRecommended, setLoadingRecommended] = React.useState(false);

  const openRecommendedModal = async () => {
    const userIdToQuery = item.user.id;
    if (!userIdToQuery) return;
    setShowRecommendedModal(true);
    setLoadingRecommended(true);
    setRecommendedList([]);
    const { data: recs } = await supabase
      .from("recomendaciones_usuarios")
      .select("recomendado_por")
      .eq("usuario_recomendado_id", userIdToQuery)
      .eq("recomienda", true)
      .range(0, 49);
    const ids = (recs || [])
      .map((r: any) => r?.recomendado_por)
      .filter(Boolean) as string[];
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("perfiles")
        .select("id,nombre,apellido_paterno,apellido_materno,foto,rol")
        .in("id", ids);
      const mapped =
        (profiles || []).map((p: any) => {
          const name = [p?.nombre, p?.apellido_paterno, p?.apellido_materno]
            .filter(Boolean)
            .join(" ")
            .trim();
          return {
            id: p.id,
            name: name || "Usuario",
            role: p.rol,
            avatar: p.foto ?? null,
          };
        }) || [];
      setRecommendedList(mapped);
    }
    setLoadingRecommended(false);
  };

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
        showRecommendedPreview={false}
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
      {positiveRecommendations > 0 && (
        <TouchableOpacity
          style={styles.recommendedRow}
          onPress={openRecommendedModal}
          activeOpacity={0.85}
        >
          <View style={styles.recommendedAvatars}>
            {recommendedByPreview.slice(0, 2).map((u, idx) => (
              <View
                key={u.id}
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
      {showRecommendedModal && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={commonStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowRecommendedModal(false)}
          >
            <View style={styles.recommendedModal}>
              <View style={styles.recommendedModalHeader}>
                <Text style={styles.recommendedModalTitle}>
                  Recomendado por
                </Text>
                <Text style={styles.recommendedModalSubtitle}>
                  {positiveRecommendations} usuarios
                </Text>
              </View>
              {loadingRecommended ? (
                <View style={styles.recommendedModalLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : (
                <FlatList
                  data={recommendedList}
                  keyExtractor={(u) => u.id}
                  contentContainerStyle={styles.recommendedModalList}
                  renderItem={({ item }) => (
                    <View style={styles.recommendedModalItem}>
                      <Avatar
                        uri={item.avatar || undefined}
                        name={item.name}
                        size={40}
                      />
                      <View style={styles.recommendedModalInfo}>
                        <Text
                          style={styles.recommendedModalName}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={styles.recommendedModalRole}
                          numberOfLines={1}
                        >
                          {item.role === "agente" ? "Agente" : "Cliente"}
                        </Text>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.recommendedModalEmpty}>
                      <Text style={styles.recommendedModalEmptyText}>
                        Aún no hay recomendaciones
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
});

export default React.memo(PostCard);
