/**
 * PropertyCard - Tarjeta de propiedad para el feed
 * ACTUALIZADO: Usa hooks reales para likes y share + navegación correcta a Messages
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { FeedItem, User } from "../../types";
import {
  useCurrentUserId,
  useFeedInteractions,
  useViewTracking,
} from "../../hooks";
import { DIMENSIONS, COLORS } from "../../constants";
import { commonStyles } from "../../styles";
import { UserHeader, ImageGallery, ReportModal, Avatar } from "../shared";
import ActionButtons from "../ActionButtons";
import { Bath } from "lucide-react-native";
import { useUserRecommendations } from "../../hooks/useUserRecommendations";
import RecommendedUsersModal from "../modals/RecommendedUsersModal";
import { propertyService } from "../../services/propertyService";

interface PropertyCardProps {
  item: FeedItem;
  onClick: () => void;
  onUserClick?: (user: User) => void;
  onCommentClick: () => void;
  showContactButton?: boolean;
  currentUserId?: string;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  item,
  onClick,
  onUserClick,
  onCommentClick,
  showContactButton = true,
  currentUserId,
}) => {
  const {
    showOptions,
    showReportModal,
    setShowOptions,
    setShowReportModal,
    handleReport,
  } = useFeedInteractions();
  const contextUserId = useCurrentUserId();
  const userId = currentUserId ?? contextUserId;
  const { trackInteraction } = useViewTracking({
    feedItemId: item.id,
    userId: currentUserId,
    isVisible: true,
  });

  const property = item.propertyDetails!;
  const images = property.images || [];

  const navigation = useNavigation<any>();

  const handleContactPress = () => {
    if (!userId) return;

    navigation.navigate("Messages", {
      initialUser: {
        id: item.user.id,
        nombre: item.user.name?.split(" ")[0] || "",
        apellido_paterno: item.user.name?.split(" ")[1] || "",
        foto: item.user.avatar || null,
      },
      initialPropertyId: property.id,
    });
  };

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

  const { recommendedList, loadingRecommended, fetchRecommendations } =
    useUserRecommendations(item.user.id);

  const openRecommendedModal = async () => {
    setShowRecommendedModal(true);
    fetchRecommendations();
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
        feedItemType="property"
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

      {/* Galería de imágenes con botones flotantes */}
      <View style={styles.imageContainer}>
        <ImageGallery
          images={images.slice(0, 3)}
          aspectRatio={DIMENSIONS.POST_ASPECT_RATIO}
          showDots={true}
          showImageCount={false}
        />

        {/* Botones de acción flotantes (Columna derecha) */}
        <View style={styles.floatingActions}>
          <ActionButtons
            feedItemId={item.id}
            feedItemType="property"
            initialLikes={item.likes}
            comments={item.comments}
            userId={currentUserId}
            onCommentClick={() => {
              trackInteraction("comentario");
              onCommentClick();
            }}
            onTrackInteraction={trackInteraction}
            shareTitle={property.title}
            shareDescription={`${
              property.operation
            } - $${property.price.toLocaleString()} ${property.currency}`}
            shareImageUrl={images[0]}
            showContactButton={false}
            orientation="vertical"
            tintColor={COLORS.white}
            authorId={item.user.id}
            propertyId={property.id}
          />
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          ID: {property.code ?? property.id} •{" "}
          {property.createdAt
            ? new Date(property.createdAt).toLocaleDateString("es-MX", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : item.timestamp}
        </Text>
      </View>

      {/* Información de la propiedad */}
      <View style={[commonStyles.cardContent, styles.compactContent]}>
        <Text style={commonStyles.title} numberOfLines={1}>
          {property.title.charAt(0).toUpperCase() + property.title.slice(1)}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>
            ${property.price.toLocaleString()} {property.currency}
          </Text>
          <View style={styles.locationInline}>
            <Ionicons name="location" size={12} color={COLORS.textSecondary} />
            <Text style={styles.locationText}>
              {property.location.city}, {property.location.state}
            </Text>
          </View>
        </View>

        {/* Contenedor de Fila Principal */}
        <View style={styles.descriptionRow}>
          <View style={styles.textContainer}>
            {item.content ? (
              <Text style={commonStyles.description} numberOfLines={2}>
                {item.content}
              </Text>
            ) : null}
          </View>

          {userId === item.user.id ? (
            <View></View>
          ) : (
            <TouchableOpacity
              style={styles.smallContactBtn}
              accessibilityLabel="Contactar asesor"
              accessibilityRole="button"
              onPress={handleContactPress}
            >
              <Ionicons
                name="chatbubble-outline"
                size={14}
                color={COLORS.white}
              />
              <Text style={styles.smallContactText}>Contactar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats minimalistas */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="bed-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.statValue}>{property.features.beds}</Text>
        </View>

        <View style={styles.statItem}>
          <Bath size={12} color={COLORS.textTertiary} />
          <Text style={styles.statValue}>{property.features.baths}</Text>
        </View>

        {property.features.parking !== undefined && (
          <View style={styles.statItem}>
            <Ionicons
              name="car-outline"
              size={14}
              color={COLORS.textTertiary}
            />
            <Text style={styles.statValue}>{property.features.parking}</Text>
          </View>
        )}

        <View style={styles.statItem}>
          <Ionicons name="cube-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.statValue}>
            {property.features.constructionSqft}m²
          </Text>
        </View>

        {property.features.landSqft && (
          <View style={[styles.statItem, { borderRightWidth: 0 }]}>
            <Ionicons
              name="resize-outline"
              size={14}
              color={COLORS.textTertiary}
            />
            <Text style={styles.statValue}>{property.features.landSqft}m²</Text>
          </View>
        )}
      </View>

      {/* Modal de reporte */}
      <ReportModal
        visible={showReportModal}
        reportType="property"
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
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    position: "relative",
  },
  floatingActions: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 10,
    alignItems: "center",
  },
  operationBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: DIMENSIONS.BORDER_RADIUS_SMALL,
    zIndex: 10,
  },
  operationText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  metaRow: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.white,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  compactContent: {
    paddingTop: 8,
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
  descriptionRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  textContainer: {
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  priceText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  locationInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  smallContactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-end",
    minWidth: 90,
  },
  smallContactText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
  },
});

export default React.memo(PropertyCard);
