/**
 * Hook personalizado para manejar interacciones del feed
 *
 * Centraliza la lógica de likes, reportes y opciones que es
 * común a todos los cards del feed (PostCard, PropertyCard, ReelCard).
 *
 * @example
 * const {
 *   isLiked,
 *   showOptions,
 *   showReportModal,
 *   handleLikeToggle,
 *   setShowOptions,
 *   setShowReportModal,
 * } = useFeedInteractions();
 */

import { useState, useCallback } from 'react';

export interface UseFeedInteractionsReturn {
  // Estados
  isLiked: boolean;
  showOptions: boolean;
  showReportModal: boolean;

  // Funciones
  handleLikeToggle: () => void;
  setShowOptions: (show: boolean) => void;
  setShowReportModal: (show: boolean) => void;
  handleReport: (reason: string) => void;
}

export const useFeedInteractions = (): UseFeedInteractionsReturn => {
  // Estados de interacción
  const [isLiked, setIsLiked] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Toggle de like optimizado con useCallback
  const handleLikeToggle = useCallback(() => {
    setIsLiked((prev) => !prev);
    // TODO: Aquí se puede agregar llamada a API para persistir el like
    // Ejemplo: await supabase.from('likes').insert({ ... })
  }, []);

  // Handler de reporte
  const handleReport = useCallback((reason: string) => {
    // TODO: Aquí se puede agregar llamada a API para reportar
    console.log('Reported:', reason);
    setShowReportModal(false);
  }, []);

  return {
    isLiked,
    showOptions,
    showReportModal,
    handleLikeToggle,
    setShowOptions,
    setShowReportModal,
    handleReport,
  };
};
