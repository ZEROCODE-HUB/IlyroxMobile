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
  TouchableOpacity,
} from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";

import LazyImage from "../LazyImage";
import { commonStyles } from "../../../styles";
import { useImageAspectRatio } from "../../hooks/useImageAspectRatio";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface ImageGalleryProps {
  images: string[];
  /**
   * Relación de aspecto usada mientras se mide la primera imagen, o si no se
   * puede medir. La galería adopta el ratio real de la imagen en cuanto lo
   * conoce, salvo que se fije `fixedAspectRatio`.
   */
  aspectRatio?: number; // 1 = cuadrado, 4/3 = horizontal, etc.
  /** Fuerza `aspectRatio` e ignora las dimensiones reales de la imagen. */
  fixedAspectRatio?: boolean;
  showDots?: boolean;
  showImageCount?: boolean;
  onImagePress?: () => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  aspectRatio = 1,
  fixedAspectRatio = false,
  showDots = true,
  showImageCount = false,
  onImagePress,
}) => {
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH);
  const [currentIndex, setCurrentIndex] = useState(0);

  // La primera imagen marca la forma de la galería; el resto se ajusta dentro
  // sin recortarse (`contain`), como en Instagram.
  const measuredRatio = useImageAspectRatio(images?.[0], aspectRatio);
  const galleryAspectRatio = fixedAspectRatio ? aspectRatio : measuredRatio;

  // Referencia al FlatList - Tipado correcto para GH FlatList
  const flatListRef = useRef<FlatList<string>>(null);

  // Callback para manejar cambios de layout y ajustar el ancho de las imágenes
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
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
      <TouchableOpacity
        activeOpacity={1}
        onPress={onImagePress}
        style={{ width: containerWidth }}
        // delayPressIn permite que el gesto de scroll se inicie sin que el componente
        // intercepte el toque inmediatamente como un tap.
        delayPressIn={80}
      >
        <LazyImage
          source={{ uri: item }}
          style={[styles.image, { width: containerWidth }]}
          // `contain` respeta la forma original de cada foto en lugar de
          // recortarla para llenar el contenedor.
          resizeMode="contain"
        />
      </TouchableOpacity>
    ),
    [containerWidth, onImagePress],
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
      style={[styles.container, { width: "100%", aspectRatio: galleryAspectRatio }]}
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
