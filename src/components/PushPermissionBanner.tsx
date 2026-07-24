import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  AppState,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { OneSignal } from "react-native-onesignal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";

/**
 * Banner que avisa cuando el permiso de notificaciones está DENEGADO.
 *
 * Contexto: si el usuario tocó "No permitir" (o lo apagó en Ajustes de iOS), su
 * dispositivo queda sin token push y NINGÚN código puede enviarle notificaciones
 * —ni siquiera `optIn()`, porque no hay permiso del SO que activar—. El único
 * camino es que el propio usuario lo reactive en Ajustes. Antes esto era
 * invisible: el usuario creía que recibiría push y no le llegaban en silencio.
 *
 * Es puramente aditivo: solo se muestra si el permiso NO está concedido, y su
 * único efecto es abrir los Ajustes del sistema. No pide permiso (para no robar
 * el foco) ni toca ninguna suscripción, así que no compromete nada.
 */
export default function PushPermissionBanner() {
  const insets = useSafeAreaInsets();
  const [denied, setDenied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const mounted = useRef(true);

  const check = async () => {
    if (Platform.OS === "web") return;
    try {
      const granted = await OneSignal.Notifications.getPermissionAsync();
      if (mounted.current) setDenied(!granted);
    } catch {
      // Ante cualquier fallo del SDK, no mostrar el banner (fail-safe).
      if (mounted.current) setDenied(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    // Pequeño respiro para que `requestPermission` del arranque resuelva antes
    // de la primera comprobación y el banner no parpadee en el primer frame.
    const t = setTimeout(check, 1500);

    // Re-comprobar al volver del background: si el usuario fue a Ajustes y
    // concedió el permiso, el banner desaparece solo al regresar.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    return () => {
      mounted.current = false;
      clearTimeout(t);
      sub.remove();
    };
  }, []);

  if (!denied || dismissed) return null;

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 70 }]} pointerEvents="box-none">
      <View style={styles.banner}>
        <Ionicons name="notifications-off-outline" size={20} color="#fff" />
        <View style={styles.textCol}>
          <Text style={styles.title}>Notificaciones desactivadas</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            Actívalas para recibir mensajes y coincidencias.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => Linking.openSettings()}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>Activar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => setDismissed(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 120,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D3748",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  subtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 1,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    paddingLeft: 2,
  },
});
