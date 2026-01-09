/**
 * ToastContext.tsx
 * Context global para sistema de notificaciones Toast
 * 
 * FEATURES:
 * - Notificaciones success, error, warning, info
 * - Auto-dismiss configurable
 * - Queue de múltiples toasts
 * - Animaciones suaves
 * 
 * @example
 * const { showToast } = useToast();
 * showToast('¡Usuario aprobado!', 'success');
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { StyleSheet, Text, Animated, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 3000) => {
      const id = `${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss
      if (duration > 0) {
        setTimeout(() => {
          hideToast(id);
        }, duration);
      }
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
};

// Componente de visualización de toasts
const ToastContainer: React.FC<{
  toasts: Toast[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  return (
    <View style={styles.container}>
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </View>
  );
};

const ToastItem: React.FC<{
  toast: Toast;
  index: number;
  onDismiss: () => void;
}> = ({ toast, index, onDismiss }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-20));

  React.useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Animación de salida antes de dismiss
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss();
      });
    }, (toast.duration || 3000) - 200);

    return () => clearTimeout(timeout);
  }, []);

  const config = getToastConfig(toast.type);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: config.backgroundColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          top: 60 + index * 70, // Stack multiple toasts
        },
      ]}
    >
      <Ionicons name={config.icon} size={20} color={COLORS.white} />
      <Text style={styles.toastText}>{toast.message}</Text>
    </Animated.View>
  );
};

// Configuración de estilos por tipo
const getToastConfig = (type: ToastType) => {
  const configs = {
    success: {
      backgroundColor: COLORS.success,
      icon: 'checkmark-circle' as const,
    },
    error: {
      backgroundColor: COLORS.error,
      icon: 'close-circle' as const,
    },
    warning: {
      backgroundColor: COLORS.warning,
      icon: 'warning' as const,
    },
    info: {
      backgroundColor: COLORS.info,
      icon: 'information-circle' as const,
    },
  };
  return configs[type];
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 6,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  toastText: {
    flex: 1,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});