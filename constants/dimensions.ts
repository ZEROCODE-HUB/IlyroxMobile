/**
 * Dimensiones y medidas globales del proyecto
 *
 * Centraliza todas las constantes de tamaño para mantener
 * consistencia visual en toda la aplicación.
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const DIMENSIONS = {
  // Dimensiones de pantalla
  SCREEN_WIDTH,
  SCREEN_HEIGHT,

  // Alturas de cards en el feed
  // CAMBIO CRÍTICO: Reels ahora son cuadrados (1.0 en lugar de 1.1)
  REEL_HEIGHT: SCREEN_WIDTH * 1.0,

  // CAMBIO CRÍTICO: Propiedades ahora son cuadradas (1.0 en lugar de 0.75)
  PROPERTY_HEIGHT: SCREEN_WIDTH * 1.0,

  // Posts mantienen ratio 4:3
  POST_ASPECT_RATIO: 4 / 3,

  // Espaciados estándar
  CARD_PADDING: 12,
  SECTION_SPACING: 16,
  BORDER_RADIUS_SMALL: 6,
  BORDER_RADIUS_MEDIUM: 12,
  BORDER_RADIUS_LARGE: 16,

  // Tamaños de avatares
  AVATAR_SMALL: 36,
  AVATAR_MEDIUM: 48,
  AVATAR_LARGE: 80,

  // Alturas de componentes UI
  HEADER_HEIGHT: 140,
  TAB_BAR_HEIGHT: 70,
  BUTTON_HEIGHT: 44,

  // Tamaños de iconos
  ICON_SMALL: 16,
  ICON_MEDIUM: 20,
  ICON_LARGE: 24,
} as const;
