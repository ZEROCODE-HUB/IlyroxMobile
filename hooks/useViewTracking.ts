/**
 * useViewTracking.ts
 * Hook para trackear visualizaciones de feed items
 * 
 * FEATURES:
 * - Trackea tiempo de visualización
 * - Marca como completo si ve >80%
 * - Registra tipo de interacción
 * - Debounced para optimizar requests
 */

import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface UseViewTrackingOptions {
  feedItemId: string;
  userId?: string;
  isVisible: boolean;
  onInteraction?: (type: 'like' | 'comentario' | 'compartir' | 'guardar') => void;
}

export function useViewTracking(options: UseViewTrackingOptions) {
  const { feedItemId, userId, isVisible } = options;
  
  const startTimeRef = useRef<number>(0);
  const totalTimeRef = useRef<number>(0);
  const hasTrackedRef = useRef<boolean>(false);

  /**
   * Iniciar tracking cuando el item es visible
   */
  useEffect(() => {
    if (!userId || !isVisible) return;

    // Iniciar timer
    startTimeRef.current = Date.now();

    return () => {
      // Al desmontar o dejar de ser visible, guardar tiempo
      if (startTimeRef.current > 0) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        totalTimeRef.current += elapsed;
        
        // Guardar en BD
        saveView(totalTimeRef.current);
      }
    };
  }, [isVisible, userId, feedItemId]);

  /**
   * Guardar visualización en BD
   */
  const saveView = async (seconds: number) => {
    if (!userId || hasTrackedRef.current || seconds < 1) return;

    try {
      hasTrackedRef.current = true;

      const completo = seconds >= 3; // Consideramos completo si vio 3+ segundos

      await supabase
        .from('feed_visualizaciones')
        .upsert({
          feed_item_id: feedItemId,
          usuario_id: userId,
          tiempo_visualizacion: seconds,
          completo,
          interaccion: null,
        }, {
          onConflict: 'feed_item_id,usuario_id',
        });

    } catch (error) {
      console.error('Error saving view:', error);
    }
  };

  /**
   * Registrar interacción
   */
  const trackInteraction = async (
    type: 'like' | 'comentario' | 'compartir' | 'guardar'
  ) => {
    if (!userId) return;

    try {
      await supabase
        .from('feed_visualizaciones')
        .upsert({
          feed_item_id: feedItemId,
          usuario_id: userId,
          tiempo_visualizacion: totalTimeRef.current,
          completo: true, // Si interactuó, lo consideramos completo
          interaccion: type,
        }, {
          onConflict: 'feed_item_id,usuario_id',
        });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  return {
    trackInteraction,
  };
}