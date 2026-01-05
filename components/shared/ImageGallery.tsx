/**
 * ImageGallery - Carrusel de imágenes reutilizable
 *
 * Componente que maneja la visualización de múltiples imágenes
 * en un carrusel horizontal. Incluye indicadores de posición (dots)
 * y badge opcional de conteo de imágenes.
 *
 * Elimina código duplicado entre PostCard y PropertyCard.
 *
 * @example
 * <ImageGallery
 *   images={['url1', 'url2', 'url3']}
 *   aspectRatio={1}
 *   showDots={true}
 *   showImageCount={true}
 * />
 */

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useImageGallery } from "../../hooks";
import { DIMENSIONS, COLORS } from "../../constants";
import { commonStyles } from "../../styles";
import LazyImage from "../LazyImage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface ImageGalleryProps {
  images: string[];
  aspectRatio?: number; // 1 = cuadrado, 4/3 = horizontal, etc.
  showDots?: boolean;
  showImageCount?: boolean;
  onImagePress?: () => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  aspectRatio = 1,
  showDots = true,
  showImageCount = false,
  onImagePress,
}) => {
  const { currentIndex, handleScroll } = useImageGallery();
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH);

  if (!images || images.length === 0) {
    return null;
  }

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  return (
    <View
      style={[styles.container, { width: "100%", aspectRatio }]}
      onLayout={onLayout}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {images.map((img, index) => (
          <LazyImage
            key={index}
            source={{ uri: img }}
            style={[styles.image, { width: containerWidth }]}
          />
        ))}
      </ScrollView>

      {/* Indicadores de carousel */}
      {showDots && images.length > 1 && (
        <View style={commonStyles.carouselDots}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                commonStyles.dot,
                currentIndex === index && commonStyles.dotActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* Badge de cantidad de imágenes */}
      {showImageCount && images.length > 1 && (
        <View style={styles.imageCountBadge}>
          <Ionicons name="grid" size={10} color={COLORS.white} />
          <Text style={styles.imageCountText}>+{images.length - 1}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    backgroundColor: COLORS.shimmer,
    overflow: "hidden",
  },
  scroll: {
    width: "100%",
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageCountBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: COLORS.blackTransparent50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  imageCountText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "bold",
  },
});

export default React.memo(ImageGallery);
