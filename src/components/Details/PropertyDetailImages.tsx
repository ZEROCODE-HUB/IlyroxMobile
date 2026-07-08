import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, FALLBACKS } from "@/constants";
import { ActionButtons, ImageGallery } from "../shared";
import { propertyDetailStyles as styles } from "./propertyDetailStyles";

const FALLBACK_IMAGE = FALLBACKS.PROPERTY_IMAGE_URL;

export interface PropertyDetailImagesProps {
  images: string[];
  currentImageIndex: number;
  onImageIndexChange: (idx: number) => void;
  onBack: () => void;
  feedItemId: string;
  feedItemLikes: number;
  feedItemComments: number;
  feedItemShares?: number;
  userId?: string;
  propertyId: string;
  shareTitle: string;
  shareDescription?: string;
  shareCode?: string;
  onCommentClick: () => void;
  onTrackInteraction: (kind: string) => void;
}

export const PropertyDetailImages: React.FC<PropertyDetailImagesProps> = ({
  images,
  currentImageIndex,
  onImageIndexChange,
  onBack,
  feedItemId,
  feedItemLikes,
  feedItemComments,
  feedItemShares,
  userId,
  propertyId,
  shareTitle,
  shareDescription,
  shareCode,
  onCommentClick,
  onTrackInteraction,
}) => {
  const hasImages = images.length > 0;
  const galleryImages = hasImages ? images : [FALLBACK_IMAGE];

  return (
    <View style={styles.imageContainer}>
      {/* Misma galería que el feed: proporción real de la foto, sin recortar,
          con marco oscuro en los lados para las verticales. */}
      <ImageGallery
        images={galleryImages}
        showDots={galleryImages.length > 1}
        showImageCount={false}
        onIndexChange={onImageIndexChange}
      />

      {/* Velo lateral para legibilidad de los iconos blancos. */}
      <LinearGradient
        colors={["transparent", "rgba(15,23,42,0.55)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        pointerEvents="none"
        style={styles.actionsScrim}
      />

      <View style={styles.floatingActions}>
        <ActionButtons
          feedItemId={feedItemId}
          feedItemType="property"
          initialLikes={feedItemLikes}
          comments={feedItemComments}
          initialShares={feedItemShares}
          userId={userId}
          onCommentClick={() => {
            onTrackInteraction("comentario");
            onCommentClick();
          }}
          onTrackInteraction={onTrackInteraction}
          shareTitle={shareTitle}
          shareDescription={shareDescription}
          shareImageUrl={hasImages ? images[0] : undefined}
          orientation="vertical"
          tintColor={COLORS.white}
          showContactButton={false}
          propertyId={propertyId}
          shareCode={shareCode}
        />
      </View>

      <TouchableOpacity onPress={onBack} style={styles.backFloating}>
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>

      {images.length > 1 && (
        <View style={styles.imageBadge}>
          <Text style={styles.imageBadgeText}>
            {currentImageIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </View>
  );
};
