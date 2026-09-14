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
 * Límites: una foto muy apaisada o muy vertical ocuparía una franja inservible
 * o una pantalla entera dentro del feed.
 *
 * El mínimo es 2:3 (alto máx = 1.5× el ancho): las verticales de teléfono
 * (3:4, 2:3) llenan el ancho sin marco lateral, y solo las más altas que 2:3
 * (p. ej. 9:16) se topan y muestran el letterbox oscuro a los costados.
 */
export const MIN_ASPECT_RATIO = 2 / 3; // vertical
export const MAX_ASPECT_RATIO = 1.91; // horizontal

/**
 * LRU cache con eviction por tamaño máximo. Implementado sin librerías
 * externas para no añadir dependencias. Mantiene el orden de inserción y
 * descarta la entrada más antigua cuando se supera el límite.
 */
const MAX_CACHE_ENTRIES = 500;

class LruMap<K, V> {
  private map = new Map<K, V>();

  get(key: K): V | undefined {
    return this.map.get(key);
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  set(key: K, value: V): void {
    // Si ya existe, refrescar posición eliminándolo primero.
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, value);
    // Evict la entrada más antigua si se supera el límite.
    if (this.map.size > MAX_CACHE_ENTRIES) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
  }
}

const ratioCache = new LruMap<string, number>();

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

