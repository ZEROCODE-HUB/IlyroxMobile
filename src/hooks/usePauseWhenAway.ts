/**
 * REV25 (#8): pausa y silencia un player de expo-video cuando la pantalla pierde el foco (el usuario navega a otra
 * pestana/pantalla) o la app pasa a segundo plano. Al volver restaura el silencio que tenia y, SOLO si estaba
 * reproduciendo antes, lo reanuda. Un video que ya estaba pausado o mudo por su propia logica queda como estaba.
 */
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useIsFocused } from "@react-navigation/native";

export function usePauseWhenAway(player: any, enabled: boolean = true) {
  const focused = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const away = !focused || !appActive;
  const previo = useRef<{ playing: boolean; muted: boolean } | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setAppActive(s === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!player || !enabled) return;
    try {
      if (away) {
        if (!previo.current) previo.current = { playing: !!player.playing, muted: !!player.muted };
        player.pause();
        player.muted = true;
      } else if (previo.current) {
        const p = previo.current;
        previo.current = null;
        player.muted = p.muted;
        if (p.playing) player.play();
      }
    } catch {
      /* player liberado */
    }
  }, [away, player, enabled]);
}
