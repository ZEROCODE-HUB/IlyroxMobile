/**
 * SafeInsetsContext.tsx
 *
 * Context global para guardar los valores INICIALES de safe area insets
 * y prevenir que los pickers nativos alteren los valores dinámicamente.
 *
 * IMPORTANTE: Este context captura los insets una sola vez al inicio
 * y los comparte con todos los componentes que necesiten safe area.
 */

import React, { createContext, useContext, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

interface SafeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const SafeInsetsContext = createContext<SafeInsets>({
  top: Platform.OS === 'ios' ? 50 : 20,
  bottom: Platform.OS === 'ios' ? 34 : 0,
  left: 0,
  right: 0,
});

export const SafeInsetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const savedInsets = useRef<SafeInsets | null>(null);

  // Guardar los insets la PRIMERA vez que tenemos valores válidos
  useEffect(() => {
    if (!savedInsets.current && insets.top > 0) {
      savedInsets.current = {
        top: insets.top,
        bottom: insets.bottom,
        left: insets.left,
        right: insets.right,
      };
    }
  }, [insets.top, insets.bottom, insets.left, insets.right]);

  // Usar los valores guardados o fallback
  const stableInsets: SafeInsets = savedInsets.current ?? {
    top: Platform.OS === 'ios' ? 50 : 20,
    bottom: Platform.OS === 'ios' ? 34 : 0,
    left: 0,
    right: 0,
  };

  return (
    <SafeInsetsContext.Provider value={stableInsets}>
      {children}
    </SafeInsetsContext.Provider>
  );
};

/**
 * Hook para obtener los insets ESTABLES que no cambian
 * aunque los pickers nativos alteren useSafeAreaInsets()
 */
export const useStableSafeInsets = (): SafeInsets => {
  return useContext(SafeInsetsContext);
};
