import React from "react";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FALLBACKS } from "@/constants";
import { ActionButtons } from "../shared";
import {
  DETAIL_IMAGE_WIDTH,
  propertyDetailStyles as styles,
} from "./propertyDetailStyles";

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

  return (
    <View style={styles.imageContainer}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const offset = e.nativeEvent.contentOffset.x;
          onImageIndexChange(Math.round(offset / DETAIL_IMAGE_WIDTH));
        }}
      >
        {hasImages ? (
          images.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={styles.image} />
          ))
        ) : (
          <Image source={{ uri: FALLBACK_IMAGE }} style={styles.image} />
        )}
      </ScrollView>

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
