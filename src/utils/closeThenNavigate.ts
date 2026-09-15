import { Platform } from "react-native";

/**
 * Cierra primero el <Modal> nativo contenedor y navega después, solo cuando es
 * seguro hacerlo:
 *  - iOS: el Modal es una capa superior a React Navigation. `router.push`
 *    durante el cierre empuja la ruta DETRÁS del modal (la navegación ocurre
 *    pero no se ve nada). Se espera la animación completa de dismiss (~350ms,
 *    duración del slide + margen). Comportamiento probado/inalterado.
 *  - Android: el Modal es una overlay de la misma Activity; la pila renderiza
 *    debajo sin problema. Solo esperamos un tick para que React aplique el
 *    cierre (50ms) y luego navegamos.
 */
export function closeThenNavigate(close: () => void, go: () => void) {
  close();
  setTimeout(go, Platform.OS === "ios" ? 350 : 50);
}