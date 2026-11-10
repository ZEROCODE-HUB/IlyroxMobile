import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useCreateContent } from "@/hooks/useCreateContent";
import { uploadVideo, uploadImage } from "@/services/uploadService";
import { usePublishQueueStore } from "@/store/publishQueueStore";
import { logger } from "@/utils/logger";

const log = logger.scoped("BackgroundPublisher");

/** Push al propio usuario (via OneSignal, como las demas) solo si la app esta en segundo plano. Si la funcion SQL no existe, se ignora. */
async function avisoPush(exito: boolean) {
  try {
    if (AppState.currentState === "active") return;
    await supabase.rpc("notificar_reel_publicado", { p_exito: exito });
  } catch {
    /* sin aviso del sistema: queda el aviso dentro de la app */
  }
}

/**
 * REV26 (#5): sube y publica el reel SIN bloquear la pantalla. Se monta una sola vez en el layout raiz.
 */
export default function BackgroundPublisher() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { createReel } = useCreateContent(user?.id);
  const runId = usePublishQueueStore((s) => s.runId);
  const corriendo = useRef(false);
  const ultimoRun = useRef(0); // evita publicar dos veces el mismo trabajo si el efecto se vuelve a ejecutar
  const createReelRef = useRef(createReel);
  createReelRef.current = createReel;

  useEffect(() => {
    const st = usePublishQueueStore.getState();
    if (!user?.id || !st.payload || !runId || corriendo.current || ultimoRun.current === runId) return;
    corriendo.current = true;
    ultimoRun.current = runId;
    const { videoUri, thumbnailUri, description } = st.payload;

    (async () => {
      try {
        let uriParaSubir = videoUri;
        // Android: se comprime en el telefono antes de subir (menos peso = sube mas rapido). iPhone ya lo convierte al elegir.
        if (Platform.OS === "android" && !videoUri.startsWith("http")) {
          st.setStatus("preparando");
          try {
            const { Video } = require("react-native-compressor");
            const comprimido = await Video.compress(
              videoUri,
              { compressionMethod: "manual", maxSize: 1280, bitrate: 2500000, minimumFileSizeForCompress: 5 },
              (p: number) => usePublishQueueStore.getState().setProgress(Math.round(p * 10)),
            );
            if (comprimido) uriParaSubir = comprimido;
          } catch (e) {
            log.warn("No se pudo comprimir, se sube el original:", e);
          }
        }

        usePublishQueueStore.getState().setStatus("subiendo");
        const res = await uploadVideo(uriParaSubir, (p) =>
          usePublishQueueStore.getState().setProgress(10 + Math.round(p * 0.9)),
        );

        let thumb: string | null = res.thumbnailUrl || null;
        if (!thumb && thumbnailUri && !thumbnailUri.startsWith("http")) {
          try {
            thumb = (await uploadImage(thumbnailUri, "reels")) || null;
          } catch (e) {
            log.warn("Miniatura manual fallo:", e);
          }
        }

        usePublishQueueStore.getState().setStatus("publicando");
        const ok = await createReelRef.current(description, res.videoUrl, thumb);
        if (ok) {
          usePublishQueueStore.getState().setStatus("listo");
          showToast("Tu reel ya está publicado", "success", 4000);
          avisoPush(true);
          setTimeout(() => {
            if (usePublishQueueStore.getState().status === "listo") usePublishQueueStore.getState().clear();
          }, 4000);
        } else {
          usePublishQueueStore.getState().setStatus("error");
          avisoPush(false);
        }
      } catch (e) {
        log.error("Publicacion en segundo plano fallo:", e);
        usePublishQueueStore.getState().setStatus("error");
        showToast("No se pudo publicar tu reel. Toca Reintentar.", "error", 5000);
        avisoPush(false);
      } finally {
        corriendo.current = false;
      }
    })();
  }, [runId, showToast, user?.id]);

  return null;
}
