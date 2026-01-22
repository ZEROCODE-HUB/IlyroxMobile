/**
 * ImageGallery - Carrusel de imágenes reutilizable
 *
 * Componente que maneja la visualización de múltiples imágenes
 * en un carrusel horizontal. Actualizado para usar FlatList
 * para mejor rendimiento y fluidez en el scroll.
 *
 * @example
 * <ImageGallery
 *   images={['url1', 'url2', 'url3']}
 *   aspectRatio={1}
 *   showDots={true}
 *   showImageCount={true}
 * />
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  ViewToken,
  LayoutChangeEvent,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { DIMENSIONS, COLORS } from "../../constants";

import LazyImage from "../LazyImage";
import { commonStyles } from "../../../styles";

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
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Referencia al FlatList
  // Referencia al FlatList - Tipado correcto para GH FlatList
  const flatListRef = useRef<FlatList<string>>(null);

  // Callback para manejar cambios de layout y ajustar el ancho de las imágenes
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      // Solo actualizamos si hay una diferencia notable para evitar re-renders excesivos
      if (width > 0 && Math.abs(width - containerWidth) > 1) {
        setContainerWidth(width);
      }
    },
    [containerWidth],
  );

  // Manejo optimizado del índice actual usando viewabilityConfig
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Renderizado de cada item de la galería
  const renderItem = useCallback(
    ({ item }: { item: string }) => (
      <LazyImage
        source={{ uri: item }}
        style={[styles.image, { width: containerWidth }]}
      />
    ),
    [containerWidth],
  );

  const keyExtractor = useCallback(
    (item: string, index: number) => `${index}-${item}`,
    [],
  );

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <View
      style={[styles.container, { width: "100%", aspectRatio }]}
      onLayout={onLayout}
    >
      <FlatList
        ref={flatListRef}
        data={images}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        snapToInterval={containerWidth}
        decelerationRate="fast"
        disableIntervalMomentum={true}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={true}
        nestedScrollEnabled={true}
        style={styles.scroll}
        // Optimizamos el cálculo de layout ya que sabemos el ancho
        getItemLayout={(_, index) => ({
          length: containerWidth,
          offset: containerWidth * index,
          index,
        })}
      />

      {/* Indicadores de carousel (Dots) */}
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

      {/* Badge de cantidad de imágenes (opcional) */}
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
