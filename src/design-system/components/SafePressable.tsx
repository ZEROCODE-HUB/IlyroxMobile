/**
 * SafePressable.tsx
 *
 * Wrapper sobre Pressable que evita el problema clásico de React Native:
 * al hacer dos taps rápidos en menos de `cooldown` ms, el segundo tap se
 * descarta. Esto previene que `router.push` se ejecute dos veces y la
 * misma pantalla se apile duplicada en el stack.
 *
 * Mecanismos complementarios:
 * 1. Throttle por timestamp (lastPressTimeRef + cooldown).
 * 2. Lock sincrónico (lockedRef) que se libera con setTimeout(cooldown)
 *    DESPUÉS de que `onPress` termine (incluyendo awaits internos).
 *
 * Uso:
 *   <SafePressable onPress={() => router.push("/(stack)/foo")}>
 *     <Text>Ir a foo</Text>
 *   </SafePressable>
 *
 * Si necesitas un cooldown distinto:
 *   <SafePressable cooldown={400} onPress={...}>
 */

import React, { useRef } from "react";
import {
  Pressable,
  GestureResponderEvent,
  StyleProp,
  ViewStyle,
} from "react-native";

export interface SafePressableProps {
  onPress?: (event: GestureResponderEvent) => void | Promise<void>;
  /**
   * Tiempo mínimo entre ejecuciones de onPress en ms. Default 400.
   * El lock se mantiene hasta que `onPress` (incluyendo awaits) termine,
   * por lo que el cooldown efectivo puede ser mayor si la acción tarda.
   */
  cooldown?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle> | any;
  activeOpacity?: number;
  children?: React.ReactNode;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  hitSlop?: number | { top: number; bottom: number; left: number; right: number };
  testID?: string;
  accessibilityLabel?: string;
  accessibilityRole?: any;
  [key: string]: any;
}

export default function SafePressable({
  children,
  onPress,
  cooldown = 400,
  disabled,
  ...props
}: SafePressableProps) {
  const lockedRef = useRef(false);
  const lastPressTimeRef = useRef(0);

  const handlePress = async (event: GestureResponderEvent) => {
    if (disabled) return;

    const now = Date.now();

    if (lockedRef.current || now - lastPressTimeRef.current < cooldown) {
      return;
    }

    lockedRef.current = true;
    lastPressTimeRef.current = now;

    try {
      await onPress?.(event);
    } finally {
      setTimeout(() => {
        lockedRef.current = false;
      }, cooldown);
    }
  };

  return (
    <Pressable {...props} disabled={disabled} onPress={handlePress}>
      {children}
    </Pressable>
  );
}
