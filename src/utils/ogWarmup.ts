/**
 * ogWarmup.ts
 *
 * Pre-calienta el cache del OG route (`/api/og`) en Vercel para que cuando
 * alguien comparta el link del post/propiedad en WhatsApp/Facebook, el
 * primer HIT del crawler sea HIT (no MISS).
 *
 * Por qué:
 *   El route `/api/og` tarda 2-3s en frío (Satori rasterizando la imagen).
 *   WhatsApp aborta requests > 3s y guarda "sin imagen" en su cache para
 *   siempre, incluso si después la URL responde en 50ms. Con warm-up,
 *   el primer HIT del crawler ya está cacheado.
 *
 * Fire-and-forget: no `await`. Si falla, no importa — el link se
 * compartirá igual, solo que con un TTFB mayor la primera vez.
 */

// Misma URL que se usa en el share de la app (propertyShareTitle / buildDeepLink).
// Si esto cambia, hay que actualizarlo acá también.
const OG_BASE = "https://posts.ilyrox.com";

/**
 * IMPORTANTE: tiene que coincidir con `OG_VERSION` en `ilyrox-posts/src/app/page.tsx`.
 * Si el og:image del meta tag tiene `&v=2`, el warm-up de la app TIENE que
 * pedir la misma URL. Si no, el primer HIT de WhatsApp con `&v=2` sería
 * MISS (2-3s) y abortaría de nuevo, manteniendo el bug.
 */
const OG_VERSION = "2";

/**
 * Dispara un fetch en background al OG route para pre-calentar el cache
 * de Vercel. NO esperar a que termine.
 *
 * @param type "post" | "property" | "reel"
 * @param id   UUID o codigo_propiedad
 */
export function warmOgCache(
  type: "post" | "property" | "reel",
  id: string,
): void {
  if (!id) return;
  const url = `${OG_BASE}/api/og?type=${type}&id=${encodeURIComponent(id)}&v=${OG_VERSION}`;
  // Fire-and-forget: no esperamos la respuesta. El catch evita un
  // "Possible unhandled promise rejection" si la red falla.
  // No usamos `keepalive: true` porque NO está soportado en React Native
  // (Expo fetch), pero el request generalmente completa antes de que el
  // usuario navegue a otra pantalla (el toast "publicado" se ve ~2.5s).
  fetch(url).catch(() => {
    // Silencioso: si falla, no pasa nada.
  });
}
