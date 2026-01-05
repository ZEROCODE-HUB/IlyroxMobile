/**
 * Hook personalizado para manejar galerías de imágenes
 *
 * Gestiona el estado y la lógica del carrusel de imágenes,
 * incluyendo el tracking del índice actual basado en el scroll.
 *
 * @example
 * const { currentIndex, handleScroll } = useImageGallery();
 */

import { useState, useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface UseImageGalleryReturn {
  currentIndex: number;
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export const useImageGallery = (): UseImageGalleryReturn => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Handler de scroll que calcula el índice actual
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  }, []);

  return {
    currentIndex,
    handleScroll,
  };
};
