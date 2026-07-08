/**
 * useDismissKeyboardWhenVisible
 *
 * Suelta el foco del TextInput activo cuando se abre un modal de selección.
 *
 * Sin esto, el input que quedó detrás (p. ej. "Código Postal" en el formulario
 * de propiedad) sigue enfocado: al cerrarse el modal el teclado reaparece y el
 * ScrollView salta de vuelta a ese input, sacando al usuario de la sección en
 * la que estaba trabajando.
 */

import { useEffect } from "react";
import { Keyboard } from "react-native";

export function useDismissKeyboardWhenVisible(visible: boolean): void {
  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);
}
