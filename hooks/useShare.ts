/**
 * useShare.ts
 * Hook para compartir contenido con deep linking
 * 
 * FEATURES:
 * - Compartir posts, reels, propiedades
 * - Deep links que abren directamente el detalle
 * - Tracking de shares
 */

import { useCallback } from 'react';
import { Share, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';

interface ShareOptions {
  feedItemId: string;
  type: 'post' | 'reel' | 'property';
  title: string;
  description: string;
  imageUrl?: string;
}

export function useShare() {
  /**
   * Generar deep link para el contenido
   */
  const generateDeepLink = useCallback(
    (feedItemId: string, type: string): string => {
      // URL de tu app (configurar en app.json)
      const scheme = 'i360realestate'; // Scheme de tu app
      
      // Deep link que abrirá el detalle
      return Linking.createURL(`feed/${type}/${feedItemId}`);
    },
    []
  );

  /**
   * Compartir contenido
   */
  const shareContent = useCallback(
    async (options: ShareOptions): Promise<boolean> => {
      const { feedItemId, type, title, description, imageUrl } = options;

      try {
        // 1. Generar deep link
        const deepLink = generateDeepLink(feedItemId, type);

        // 2. Mensaje para compartir
        const message = `${title}\n\n${description}\n\n${deepLink}`;

        // 3. Compartir (nativo)
        const result = await Share.share({
          message,
          url: Platform.OS === 'ios' ? deepLink : undefined,
          title,
        });

        // 4. Registrar share en BD (opcional, para analytics)
        if (result.action === Share.sharedAction) {
          await supabase.from('feed_visualizaciones').insert({
            usuario_id: null, // Anónimo si no hay usuario
            feed_item_id: feedItemId,
            tipo_interaccion: 'share',
          });

          return true;
        }

        return false;
      } catch (error) {
        console.error('Error sharing:', error);
        return false;
      }
    },
    [generateDeepLink]
  );

  /**
   * Manejar deep link entrante (cuando alguien abre un link compartido)
   */
  const handleDeepLink = useCallback(
    async (
      url: string
    ): Promise<{ type: string; feedItemId: string } | null> => {
      try {
        const { path, queryParams } = Linking.parse(url);

        if (!path) return null;

        // Parsear: feed/post/abc123 o feed/property/xyz789
        const parts = path.split('/');
        if (parts.length !== 3 || parts[0] !== 'feed') return null;

        const [, type, feedItemId] = parts;

        if (!feedItemId) return null;

        return { type, feedItemId };
      } catch (error) {
        console.error('Error parsing deep link:', error);
        return null;
      }
    },
    []
  );

  return {
    shareContent,
    handleDeepLink,
    generateDeepLink,
  };
}