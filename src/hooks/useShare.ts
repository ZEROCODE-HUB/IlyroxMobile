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
import { Share } from "react-native";
import { supabase } from "../lib/supabase";
import * as Linking from "expo-linking";
import { useAuth } from "@/context/AuthContext";
import { logger } from "@/utils/logger";
import { collapseSpaces } from "@/utils/stringNormalizer";
import { toShareText } from "@/utils/shareText";

const log = logger.scoped("useShare");

/** Largo máximo de la descripción dentro del mensaje nativo. */
const MAX_SHARE_DESCRIPTION = 160;

/** Texto que se usa si el contenido no traía descripción. */
const SHARE_DESCRIPTION_FALLBACK = "Mira esto en Ilyrox";

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
  const { user } = useAuth();

  /**
   * Generar deep link para el contenido
   */
  const generateDeepLink = useCallback(
    (
      feedItemId: string,
      type: string,
      sinDatos?: boolean,
      sharerId?: string,
    ): string => {
      // URL base (DNS de posts.ilyrox.com confirmado y apuntando a ilyrox-posts)
      const baseUrl = "https://posts.ilyrox.com/";

      let url = `${baseUrl}?type=${type}&id=${feedItemId}`;
      if (sinDatos) {
        url += `&sd=1`;
      }
      if (sharerId) {
        url += `&sharedBy=${sharerId}`;
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
          user?.id,
        );

        // 2. Mensaje para compartir.
        //
        // La descripción pasa SIEMPRE por `toShareText`: el campo viene con
        // los `\n\n` de cada párrafo (que se CONSERVAN, para que el mensaje
        // respete los saltos de línea) y algunos call sites lo recortaban con
        // `.substring(0, N)`, que parte palabras a la mitad. Sanear aquí, y no
        // en cada call site, garantiza que ningún texto llegue roto al
        // mensaje — también los que se agreguen en el futuro.
        //
        // El link va SIEMPRE al final, separado por una línea en blanco, y
        // vive SOLO en `message` (en ambas plataformas). En iOS, si además se
        // pasaba `url`, varios destinos (Mensajes, Mail, "Copiar", WhatsApp)
        // concatenan message + url y el link quedaba pegado a la descripción
        // o directamente duplicado. Con un solo string el orden es el que
        // armamos acá: título, descripción con sus saltos, y el link abajo.
        const boldTitle = `*${collapseSpaces(toShareText(title, 80))}*`;
        const cleanDescription = toShareText(
          description,
          MAX_SHARE_DESCRIPTION,
          SHARE_DESCRIPTION_FALLBACK,
        );
        const message = `${boldTitle}\n\n${cleanDescription}\n\n${deepLink}`;

        // 3. Compartir (nativo)
        const result = await Share.share({ message });

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
    [generateDeepLink, user],
  );

  /**
   * Manejar deep link entrante (cuando alguien abre un link compartido)
   */
  const handleDeepLink = useCallback(
    async (
      url: string,
    ): Promise<{ type: string; feedItemId: string } | null> => {
      try {
        const { queryParams } = Linking.parse(url);

        if (!queryParams) return null;

        const type = queryParams.type as string; // 'property' | 'post' | 'reel'
        const feedItemId = queryParams.id as string; // id o codigo_propiedad

        if (!type || !feedItemId) {
          // Fallback para legacy links si es necesario
          // Por ahora solo soportamos el nuevo formato
          return null;
        }

        return { type, feedItemId };
      } catch (error) {
        log.error("Error parsing deep link:", error);
        return null;
      }
    },
    [],
  );

  return {
    shareContent,
    handleDeepLink,
    generateDeepLink,
  };
}
