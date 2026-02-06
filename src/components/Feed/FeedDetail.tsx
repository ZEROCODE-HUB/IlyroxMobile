import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { FeedItem, User } from "../../types";
import CommentsBottomSheet from "../modals/CommentsBottomSheet";
import UserHeader from "../UserHeader";
import ActionButtons from "../ActionButtons";
import { ImageGallery, RichText } from "../shared";
import { ScreenWrapper } from "../../screens/ScreenWrapper";
import { AppHeader } from "../AppHeader";
import { commonStyles } from "styles";
import { SpecialPostCard } from "./SpecialPostCard";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface FeedDetailProps {
  item: FeedItem;
  onClose: () => void;
  onUserClick?: (user: User) => void;
  currentUserId?: string;
}

const FeedDetail: React.FC<FeedDetailProps> = ({
  item,
  onClose,
  onUserClick,
  currentUserId,
}) => {
  const images = item.images || item.propertyDetails?.images || [];
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const isSpecialPost =
    ["openhouse", "aniversario", "sold"].includes(item.postType) ||
    (item.postType === "busqueda" && !!item.postDetails?.busquedas_json);

  const hasImages = images.length > 0;
  const isSearchPost = item.postType === "busqueda";
  const isShortContent = item.content.length < 100;

  // Ref para el estado de comentarios (para el PanResponder)
  const showCommentsRef = useRef(false);
  useEffect(() => {
    showCommentsRef.current = showComments;
  }, [showComments]);

  // Animación para el gesto de swipe down
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture if vertical movement is dominant and significant
        return (
          !showCommentsRef.current &&
          Math.abs(gestureState.dy) > 15 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150 || gestureState.vy > 0.5) {
          Animated.timing(panY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            panY.setValue(0);
            onClose();
          });
        } else {
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

  return (
    <ScreenWrapper withHeader={false} style={styles.container}>
      <AppHeader
        title={item.type === "property" ? "Propiedad" : "Publicación"}
        showBackButton={true}
        onBack={onClose}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <UserHeader
          user={item.user}
          timestamp={item.timestamp}
          onUserClick={onUserClick}
          showOptions={showOptions}
          setShowOptions={setShowOptions}
          onReport={() => setShowReportModal(true)}
        />

        {/* Galería de imágenes - AHORA RESPONSIVA */}
        {images.length > 0 && !isSpecialPost && (
          <ImageGallery
            images={images}
            aspectRatio={1}
            showDots={true}
            showImageCount={false}
          />
        )}

        {/* Botones de acción - Estilo Instagram */}
        {images.length > 0 && !isSpecialPost && (
          <View style={styles.actionsContainer}>
            <ActionButtons
              feedItemId={item.id}
              feedItemType={item.type}
              initialLikes={item.likes}
              comments={item.comments}
              userId={currentUserId}
              onCommentClick={() => setShowComments(true)}
              shareTitle={
                item.propertyDetails?.title ||
                `Post de ${item.user.nombre || item.user.name}`
              }
              shareDescription={item.content.substring(0, 100)}
              shareImageUrl={images[0]}
              showContactButton={false}
              orientation="horizontal"
              authorId={item.user.id}
            />
          </View>
        )}

        {/* Área de contenido principal */}
        {isSpecialPost ? (
          <View style={styles.specialCardWrapper}>
            <SpecialPostCard item={item} mode="detail" />
          </View>
        ) : null}

        <View style={styles.body}>
          {/* Detalles de propiedad */}
          {item.propertyDetails && (
            <View style={styles.propertyCard}>
              <Text style={styles.price}>
                ${item.propertyDetails.price.toLocaleString()}
                {item.propertyDetails.currency}
              </Text>
              <Text style={styles.propertyTitle}>
                {item.propertyDetails.title}
              </Text>
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={14} color={COLORS.primary} />
                <Text style={styles.locationAddress}>
                  {item.propertyDetails.location.address}
                </Text>
              </View>

              {/* Stats de la propiedad */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {item.propertyDetails.features.beds}
                  </Text>
                  <Text style={styles.statLabel}>Recámaras</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {item.propertyDetails.features.baths}
                  </Text>
                  <Text style={styles.statLabel}>Baños</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {item.propertyDetails.features.constructionSqft}
                  </Text>
                  <Text style={styles.statLabel}>m²</Text>
                </View>
              </View>
            </View>
          )}

          {/* Contenido del post (si no es especial) */}
          {!isSpecialPost &&
            (!hasImages && !item.propertyDetails ? (
              <View
                style={[
                  styles.textPostContainer,
                  isShortContent && styles.textPostGradient,
                  isSearchPost && commonStyles.cardDetail,
                ]}
              >
                <RichText
                  style={[
                    isShortContent
                      ? styles.textPostLarge
                      : styles.textPostNormal,
                    isSearchPost && commonStyles.textDetail,
                  ]}
                  content={item.content}
                  iconSize={isSearchPost ? 18 : 16}
                  iconColor={
                    isSearchPost ? COLORS.primaryDark : COLORS.textPrimary
                  }
                />
              </View>
            ) : (
              <RichText style={styles.content} content={item.content} />
            ))}

          {/* Amenidades */}
          {item.propertyDetails?.amenities &&
            item.propertyDetails.amenities.length > 0 && (
              <View style={styles.amenitiesSection}>
                <Text style={styles.sectionTitle}>Amenidades</Text>
                <View style={styles.amenitiesContainer}>
                  {item.propertyDetails.amenities.map((amenity) => (
                    <View key={amenity} style={styles.amenityChip}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* BOTONES DE ACCIÓN - (Para todos los casos excepto cuando ya se mostraron arriba) */}
          {(!hasImages || isSpecialPost) && (
            <View style={styles.actionButtonsContainer}>
              <ActionButtons
                feedItemId={item.id}
                feedItemType={item.type}
                initialLikes={item.likes}
                comments={item.comments}
                userId={currentUserId}
                onCommentClick={() => setShowComments(true)}
                shareTitle={`Post de ${item.user.nombre || item.user.name}`}
                shareDescription={item.content.substring(0, 100)}
                showContactButton={false}
                authorId={item.user.id}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de comentarios */}
      <CommentsBottomSheet
        visible={showComments}
        onClose={() => setShowComments(false)}
        feedItemId={item.id}
        currentUserId={currentUserId}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    position: "relative",
    width: SCREEN_WIDTH,
    aspectRatio: 1, // Usar aspectRatio en lugar de altura fija
  },
  imageGallery: {
    aspectRatio: 1, // Usar aspectRatio en lugar de altura fija
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    aspectRatio: 1, // Usar aspectRatio en lugar de altura fija
  },
  body: {
    padding: 16,
  },
  propertyCard: {
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  propertyTitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  locationAddress: {
    marginLeft: 4,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  statBox: {
    backgroundColor: COLORS.white,
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: COLORS.black,
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontWeight: "bold",
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  textPostContainer: {
    paddingVertical: 16,
    minHeight: 100,
  },
  textPostGradient: {
    backgroundColor: COLORS.gradientBackground,
    alignItems: "center",
    minHeight: 200,
    borderRadius: 12,
    marginTop: 8,
    padding: 16,
  },
  textPostLarge: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  textPostNormal: {
    fontSize: 16,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  actionButtonsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 16,
  },
  amenitiesSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    backgroundColor: COLORS.primaryTransparent,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  amenityText: {
    color: COLORS.primaryDark,
    fontSize: 13,
  },
  actionsContainer: {
    paddingHorizontal: 12,
    width: "100%",
    backgroundColor: COLORS.white,
    paddingVertical: 4,
  },
  specialCardWrapper: {
    width: "100%",
    backgroundColor: COLORS.white,
  },
});

export default React.memo(FeedDetail);
