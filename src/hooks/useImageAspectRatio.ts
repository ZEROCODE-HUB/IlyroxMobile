/**
 * useImageAspectRatio
 *
 * Mide una imagen remota y devuelve su relación de aspecto real (ancho/alto),
 * para poder mostrarla sin recortarla. Mientras la medición está en curso
 * devuelve el `fallback`, de modo que el layout nunca queda sin altura.
 *
 * El resultado se cachea a nivel de módulo: el feed vuelve a montar las mismas
 * celdas al hacer scroll y, sin caché, cada montaje remediría la imagen y
 * provocaría un salto de layout.
 */

import { useEffect, useState } from "react";
import { Image } from "react-native";

/**
 * Límites al estilo Instagram: una foto muy apaisada o muy vertical ocuparía
 * una franja inservible o una pantalla entera dentro del feed.
 */
export const MIN_ASPECT_RATIO = 4 / 5; // vertical
export const MAX_ASPECT_RATIO = 1.91; // horizontal

const ratioCache = new Map<string, number>();

function clampRatio(ratio: number): number {
  return Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, ratio));
}

export function useImageAspectRatio(
  uri: string | undefined,
  fallback: number,
): number {
  // Solo fuerza el re-render; el valor se lee de la caché.
  const [, setMeasuredCount] = useState(0);

  useEffect(() => {
    if (!uri || ratioCache.has(uri)) return;

    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (cancelled || !width || !height) return;
        ratioCache.set(uri, clampRatio(width / height));
        setMeasuredCount((n) => n + 1);
      },
      () => {
        // Imagen inaccesible: se queda con el fallback.
      },
    );

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!uri) return fallback;
  return ratioCache.get(uri) ?? fallback;
}
