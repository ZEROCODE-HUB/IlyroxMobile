/**
 * Configuración y valores numéricos reutilizables
 *
 * Centraliza los "magic numbers" del proyecto: tamaños de página,
 * límites, timeouts y debounces. Sustituye hardcodes como
 * `pageSize = 10` o `setTimeout(..., 300)` en componentes y hooks.
 */

export const PAGINATION = {
  FEED_PAGE_SIZE: 10,
  REEL_PAGE_SIZE: 10,
  PROPERTY_PAGE_SIZE: 20,
  SEARCH_RESULTS_LIMIT: 50,
  COMMENTS_PAGE_SIZE: 20,
  NOTIFICATIONS_PAGE_SIZE: 30,
  MESSAGES_PAGE_SIZE: 25,
} as const;

export const LIMITS = {
  MAX_IMAGES_PER_PROPERTY: 20,
  MAX_IMAGES_PER_POST: 10,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_TITLE_LENGTH: 120,
  MAX_COMMENT_LENGTH: 500,
  MAX_BIO_LENGTH: 300,
  MIN_PASSWORD_LENGTH: 8,
  MAX_VIDEO_DURATION_SECONDS: 60,
} as const;

export const TIMEOUTS = {
  SEARCH_DEBOUNCE_MS: 300,
  INPUT_DEBOUNCE_MS: 250,
  TOAST_DURATION_MS: 2500,
  REQUEST_TIMEOUT_MS: 15000,
  SESSION_REFRESH_MS: 5 * 60 * 1000,
} as const;

export const FALLBACKS = {
  AVATAR_URL: "https://picsum.photos/150",
  PROPERTY_IMAGE_URL:
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1080&q=80",
  VIDEO_URL: "https://www.w3schools.com/html/mov_bbb.mp4",
} as const;

export const UI = {
  FEED_VIEWABILITY_THRESHOLD: 0.7,
  REEL_AUTOPLAY_THRESHOLD: 0.8,
  ANIMATION_FAST_MS: 150,
  ANIMATION_NORMAL_MS: 250,
  ANIMATION_SLOW_MS: 400,
} as const;
