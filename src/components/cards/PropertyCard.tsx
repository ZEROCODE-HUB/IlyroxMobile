/**
 * PropertyCard - Tarjeta de propiedad para el feed
 * ACTUALIZADO: Usa hooks reales para likes y share + navegación correcta a Messages
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { FeedItem, User } from "../../types";
import {
  useCurrentUserId,
  useFeedInteractions,
  useViewTracking,
} from "@/hooks";
import { DIMENSIONS, COLORS } from "../../constants";
import { commonStyles } from "../../../styles";
import { UserHeader, ImageGallery, ReportModal, Avatar } from "../shared";
import ActionButtons from "../ActionButtons";
import { Toilet } from "lucide-react-native";
import { useUserRecommendations } from "@/hooks/useUserRecommendations";
import RecommendedUsersModal from "../modals/RecommendedUsersModal";
import { useChatInitiator } from "@/hooks/messaging/useChatInitiator";
import { MapModal } from "../shared/MapModal";
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/context/ToastContext";
import firstUpperCase from "@/utils/firstUpperCase";
import { formatOperation } from "@/utils/priceFormatter";
import { formatDateShort } from "@/utils/dateFormatter";

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

  const { showToast } = useToast();

  const property = item.propertyDetails!;

  const images = property.images || [];

  const { handleContact } = useChatInitiator();

  const [showMap, setShowMap] = React.useState(false);

  const handleContactPress = () => {
    if (!userId) return;

    handleContact(item.user.id, property.id, {
      id: item.user.id,
      nombre: item.user.name?.split(" ")[0] || "",
      apellido_paterno: item.user.name?.split(" ")[1] || "",
      foto: item.user.avatar || null,
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

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showToast(`${label} copiado`, "success");
  };

  const location = `${property.colonia ? property.colonia + ", " : ""}${property.location.municipio ? property.location.municipio + ", " : ""}${property.location.state ? property.location.state : ""}`;

  const renderOperationsLabel = () => {
    if (property.operations && property.operations.length > 0) {
      return property.operations
        .map((op) => formatOperation(op.tipo_operacion, op.precio, op.moneda))
        .join(" / ");
    }
    const tipo = property.operation === "Sale" ? "venta" : "renta";
    return formatOperation(tipo, property.price, property.currency);
  };

  const title = `${firstUpperCase(property.subtype) || firstUpperCase(property.type)} en ${property.location.municipio || property.location.state}`;

  return (
    <View style={commonStyles.card}>
      {/* Header y recomendaciones clickeables */}
      <TouchableOpacity activeOpacity={0.9} onPress={onClick}>
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
      </TouchableOpacity>

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

      {/* Galería de imágenes - independiente para evitar conflictos de gestos */}
      <View style={styles.imageContainer}>
        <ImageGallery
          images={images}
          aspectRatio={DIMENSIONS.POST_ASPECT_RATIO}
          showDots={true}
          showImageCount={false}
          onImagePress={onClick}
        />

        {/* Botones de acción flotantes */}
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
            shareDescription={`${renderOperationsLabel()} - ${
              property.location?.city
            }`}
            shareImageUrl={images[0]}
            showContactButton={false}
            orientation="vertical"
            tintColor={COLORS.white}
            authorId={item.user.id}
            propertyId={property.id}
            shareCode={property.codigo_propiedad || property.code}
          />
        </View>
      </View>

      <Pressable
        style={styles.metaRow}
        onPress={() =>
          copyToClipboard(property.code || property.codigo_propiedad || "", "ID")
        }
      >
        <Text style={styles.metaText}>
          ID: {property.code ? property.code : property.codigo_propiedad}{" "}
          <Ionicons
            name="copy-outline"
            size={10}
            color={COLORS.textSecondary}
          />{" "}
          •{" "}
          {property.createdAt
            ? formatDateShort(property.createdAt)
            : item.timestamp}
        </Text>
      </Pressable>

      {/* Información de la propiedad clickeable */}
      <TouchableOpacity activeOpacity={0.9} onPress={onClick}>
        <View style={[commonStyles.cardContent, styles.compactContent]}>
          <Text style={commonStyles.title} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{renderOperationsLabel()}</Text>
            <View></View>
          </View>
          <Pressable
            style={styles.locationInline}
            onPress={() => setShowMap(true)}
          >
            <Ionicons name="location" size={12} color={COLORS.textSecondary} />
            <Text style={styles.locationText}>{location}</Text>
          </Pressable>

          <View style={styles.descriptionRow}>
            <View style={styles.textContainer}>
              {item.content ? (
                <Text style={commonStyles.description} numberOfLines={2}>
                  {item.content}
                </Text>
              ) : null}
            </View>

            {userId !== item.user.id && (
              <TouchableOpacity
                style={styles.smallContactBtn}
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
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.9} onPress={onClick}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons
              name="bed-outline"
              size={14}
              color={COLORS.textTertiary}
            />
            <Text style={styles.statValue}>{property.features.beds}</Text>
          </View>

          <View style={styles.statItem}>
            <Toilet size={12} color={COLORS.textTertiary} />
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
            <Ionicons
              name="home-outline"
              size={14}
              color={COLORS.textTertiary}
            />
            <Text style={styles.statValue}>
              {property.features.constructionSqft}m²
            </Text>
          </View>

          {property.features.landSqft > 0 && (
            <View style={[styles.statItem, { borderRightWidth: 0 }]}>
              <Ionicons
                name="resize-outline"
                size={14}
                color={COLORS.textTertiary}
              />
              <Text style={styles.statValue}>
                {property.features.landSqft}m²
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <MapModal
        visible={showMap}
        onClose={() => setShowMap(false)}
        property={property}
      />

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
    </View>
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
    paddingTop: 5,
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
