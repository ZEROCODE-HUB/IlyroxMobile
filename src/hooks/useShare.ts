/**
 * useShare.ts
 * Hook para compartir contenido con deep linking
 *
 * FEATURES:
 * - Compartir posts, reels, propiedades
 * - Deep links que abren directamente el detalle
 * - Tracking de shares
 */

import { useCallback } from "react";
import { Share, Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { logger } from "@/utils/logger";const log = logger.scoped("useShare");

interface ShareOptions {
  feedItemId: string;
  shareId?: string;
  type: "post" | "reel" | "property";
  title: string;
  description: string;
  imageUrl?: string;
  sinDatos?: boolean;
}

export function useShare() {
  /**
   * Generar deep link para el contenido
   */
  const generateDeepLink = useCallback(
    (feedItemId: string, type: string, sinDatos?: boolean): string => {
      // URL base
      const baseUrl = "https://ilyrox-posts.vercel.app/";

      let url = `${baseUrl}?type=${type}&id=${feedItemId}`;
      if (sinDatos) {
        url += `&sd=1`;
      }
      return url;
    },
    [],
  );

  /**
   * Compartir contenido
   */
  const shareContent = useCallback(
    async (options: ShareOptions): Promise<boolean> => {
      const {
        feedItemId,
        shareId,
        type,
        title,
        description,
        sinDatos,
      } = options;

      try {
        // 1. Generar deep link
        const deepLink = generateDeepLink(
          shareId || feedItemId,
          type,
          sinDatos,
        );

        // 2. Mensaje para compartir
        const message = `${title}\n\n${description}\n\n${deepLink}`;

        // 3. Compartir (nativo)
        const result = await Share.share({
          message,
          url: Platform.OS === "ios" ? deepLink : undefined,
          title,
        });

        // 4. Registrar share en BD: incrementa compartidos_count vía RPC
        //    (la función también registra la interacción en feed_visualizaciones
        //    si hay usuario autenticado). No degradamos la UX si la RPC falla.
        if (result.action === Share.sharedAction) {
          const { error } = await supabase.rpc("incrementar_compartidos", {
            p_feed_item_id: feedItemId,
          });
          if (error) log.warn("No se pudo registrar el compartido:", error);

          return true;
        }

        return false;
      } catch (error) {
        log.error("Error sharing:", error);
        return false;
      }
    },
    [generateDeepLink],
  );

  // El link entrante lo resuelve `src/app/+native-intent.ts` con
  // `parseSharedLink` (src/utils/deepLink.ts), que corre antes del ruteo.

  return {
    shareContent,
    generateDeepLink,
  };
}
