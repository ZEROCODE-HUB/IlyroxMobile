/**
 * deepLink.ts
 * Traducción de los links compartidos al árbol de rutas de expo-router.
 *
 * Los links que genera `useShare` viven todos en la raíz con query
 * (`https://ilyrox-posts.vercel.app/?type=property&id=XXX&sd=1`), formato que no
 * es mapeable directamente por expo-router. Aquí se convierte a la ruta real.
 *
 * Se usa desde `src/app/+native-intent.ts` (universal links y esquema propio).
 */

export interface DeepLinkTarget {
  /** Ruta de expo-router, con el grupo explícito. */
  pathname: string;
  params: Record<string, string>;
  /** La misma ruta ya serializada, que es lo que espera `redirectSystemPath`. */
  href: string;
}

const RUTAS: Record<string, string> = {
  property: "/(stack)/property",
  post: "/(stack)/post",
  reel: "/(stack)/reel",
};

/** Lee un parámetro del query sin depender de `URL`, incompleto en Hermes. */
function getQueryParam(url: string, key: string): string | null {
  const match = url.match(new RegExp(`[?&]${key}=([^&#]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Convierte un link compartido en su destino dentro de la app.
 * Devuelve null si la URL no es un link de contenido (el llamador decide el
 * fallback), de forma que rutas ya nativas como /reset-password no se toquen.
 */
export function parseSharedLink(url: string): DeepLinkTarget | null {
  if (!url) return null;

  const type = getQueryParam(url, "type");
  const id = getQueryParam(url, "id");
  if (!type || !id) return null;

  const base = RUTAS[type];
  if (!base) return null;

  // `sd=1` en la web equivale a `sinDatos` en la app: oculta los datos del asesor.
  const sinDatos = getQueryParam(url, "sd") === "1";

  const params: Record<string, string> = { id };
  if (sinDatos) params.sinDatos = "true";

  const href = `${base}/${encodeURIComponent(id)}${sinDatos ? "?sinDatos=true" : ""}`;

  return { pathname: `${base}/[id]`, params, href };
}

/**
 * Destino a la espera de que la app pueda navegar.
 *
 * `+native-intent` corre antes de que exista sesión: si el usuario no ha
 * iniciado sesión, `_layout` lo manda a /login y el destino se perdería. Se
 * guarda aquí —mismo patrón que el toque en una push— y se consume después.
 */
let pendingDeepLink: DeepLinkTarget | null = null;

export function setPendingDeepLink(target: DeepLinkTarget | null) {
  pendingDeepLink = target;
}

/** Devuelve el destino guardado y lo consume. */
export function takePendingDeepLink(): DeepLinkTarget | null {
  const target = pendingDeepLink;
  pendingDeepLink = null;
  return target;
}
