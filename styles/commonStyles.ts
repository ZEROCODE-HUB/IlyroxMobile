/**
 * Estilos comunes reutilizables
 *
 * Define estilos compartidos entre múltiples componentes
 * para evitar duplicación y mantener consistencia.
 */

import { COLORS, DIMENSIONS } from "@/constants";
import { StyleSheet } from "react-native";

export const commonStyles = StyleSheet.create({
  // Cards
  card: {
    backgroundColor: COLORS.white,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },

  cardContent: {
    padding: DIMENSIONS.CARD_PADDING,
  },

  cardDetail: {
    backgroundColor: COLORS.infoLight,
    borderRadius: 12,
    marginTop: 8,
    padding: 14,
    alignItems: "flex-start",
  },
  textDetail: {
    textAlign: "left",
    fontWeight: "700",
    fontSize: 18,
    color: COLORS.primaryDark,
    lineHeight: 28,
  },
  // Carrusel de imágenes
  carouselDots: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.whiteTransparent50,
  },

  dotActive: {
    backgroundColor: COLORS.white,
  },

  // Modales
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
  },

  menuContainer: {
    backgroundColor: COLORS.white,
    borderRadius: DIMENSIONS.BORDER_RADIUS_MEDIUM,
    padding: DIMENSIONS.CARD_PADDING,
    width: 280,
  },

  menuItem: {
    paddingVertical: 12,
  },

  menuItemText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },

  // Badges
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: DIMENSIONS.BORDER_RADIUS_SMALL,
  },

  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "600",
  },

  // Textos comunes
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  // Contenedores de imágenes
  imageContainer: {
    backgroundColor: COLORS.shimmer,
    overflow: "hidden",
  },
});
