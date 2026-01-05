/**
 * Paleta de colores global del proyecto
 *
 * Define todos los colores usados en la aplicación para
 * mantener consistencia visual y facilitar cambios de tema.
 */

export const COLORS = {
  // Colores primarios
  primary: "#45a0a5",
  primaryDark: "#378084",
  primaryLight: "#6eb8bc",
  primaryTransparent: "rgba(69, 160, 165, 0.1)",

  // Estados
  success: "#2d9a8a",
  successDark: "#1f6b60",
  successLight: "#ecfdf5",
  error: "#e55353",
  errorDark: "#b91c1c",
  errorLight: "#fee2e2",
  errorTransparent: "rgba(229, 83, 83, 0.1)",
  warning: "#f39c12",
  warningDark: "#92400e",
  warningLight: "#ffedd5",
  info: "#3498db",
  infoDark: "#0369a1",
  infoLight: "#dbeafe",

  // Colores adicionales para etiquetas
  tagPurple: "#8b5cf6",
  tagPink: "#ec4899",
  tagPurpleLight: "#f3e8ff",
  tagPinkLight: "#fce7f3",

  // Textos
  textPrimary: "#1a2e2f",
  textSecondary: "#5a7172",
  textTertiary: "#90a4a5",
  textDisabled: "#bdc8c9",

  // Backgrounds
  white: "#ffffff",
  black: "#000000",
  background: "#f4f8f8",
  backgroundDark: "#e8f1f1",
  backgroundDeep: "#0f172a",
  cardBorder: "#e2ecec",
  darkSurface: "#1a2e2f",
  darkBorder: "#2d4a4b",

  // Overlays
  overlay: "rgba(26, 46, 47, 0.4)",
  overlayDark: "rgba(26, 46, 47, 0.6)",
  overlayLight: "rgba(26, 46, 47, 0.2)",

  // Componentes específicos
  gradientBackground: "#f0fafa",
  shimmer: "#e2ecec",

  // Transparencias (basadas en blanco puro para contrastar con el fondo teal suave)
  whiteTransparent20: "rgba(255,255,255,0.2)",
  whiteTransparent30: "rgba(255,255,255,0.3)",
  whiteTransparent50: "rgba(255,255,255,0.5)",
  whiteTransparent60: "rgba(255,255,255,0.6)",
  whiteTransparent70: "rgba(255,255,255,0.7)",
  whiteTransparent80: "rgba(255,255,255,0.8)",
  whiteTransparent90: "rgba(255,255,255,0.9)",
  whiteTransparent95: "rgba(255,255,255,0.95)",
  blackTransparent50: "rgba(26, 46, 47, 0.5)",
  blackTransparent30: "rgba(26, 46, 47, 0.3)",
  blackTransparent60: "rgba(26, 46, 47, 0.6)",
  blackTransparent80: "rgba(26, 46, 47, 0.8)",

  // Marcas
  facebook: "#1877f2",
  google: "#ea4335",
  apple: "#000000",
} as const;
