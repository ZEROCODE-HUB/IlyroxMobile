// ============================================
// fieldAnchors - Registro de anclas a nivel de campo para el scroll-al-error
// Cada campo validable se envuelve en <FieldAnchor name="..."> y registra su
// nodo nativo; CreateProperty mide su posición con measureLayout y hace scroll
// exacto a ese input (no a la sección completa).
// ============================================

import React, { createContext, useContext } from "react";
import { View, type ViewStyle } from "react-native";

/** (key) => ref callback que registra/borra el nodo del campo. */
type RegisterField = (key: string) => (node: unknown) => void;

const noop: RegisterField = () => () => {};

export const FieldAnchorContext = createContext<RegisterField>(noop);

export const useFieldAnchor = () => useContext(FieldAnchorContext);

export function FieldAnchor({
  name,
  children,
  style,
}: {
  name: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const register = useFieldAnchor();
  return (
    <View ref={register(name) as never} collapsable={false} style={style}>
      {children}
    </View>
  );
}
