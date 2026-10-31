import { Image as RNImage, Platform } from "react-native";
import { supabase } from "@/lib/supabase";
import * as ImageManipulator from "expo-image-manipulator";
import { logger } from "@/utils/logger";

const log = logger.scoped("uploadService");

const VIDEO_API_URL = "https://video.109.205.178.162.sslip.io";

/** Mensaje para el usuario cuando el servidor de fotos y videos no responde. */
export const MEDIA_UNAVAILABLE_MESSAGE =
  "Actualmente presentamos fallas con archivos multimedia, favor de intentarlo más tarde.";

/**
 * La subida de una foto o video falló (servidor caído, sin red, timeout, 5xx o
 * respuesta inválida). Quien publica debe avisar con `MEDIA_UNAVAILABLE_MESSAGE`
 * y NO publicar sin el archivo.
 */
export class MediaUnavailableError extends Error {
  constructor(readonly cause?: unknown) {
    super(MEDIA_UNAVAILABLE_MESSAGE);
    this.name = "MediaUnavailableError";
  }
}

export const isMediaUnavailable = (err: unknown): err is MediaUnavailableError =>
  err instanceof MediaUnavailableError ||
  (err as { name?: string } | null)?.name === "MediaUnavailableError";

/** Tiempo máximo por intento de subida de una foto. Sin esto, un servidor que no responde deja la subida colgada. */
const IMAGE_UPLOAD_TIMEOUT_MS = 30000;

/**
 * REV14-06: el servidor de fotos rechazo el archivo (error 4xx: formato o tamano no valido). Es un problema de ESA foto,
 * no una falla del servicio, asi que no se reintenta ni se muestra el aviso generico de "fallas con archivos multimedia".
 * Hereda de MediaUnavailableError para que el resto de pantallas se comporten igual que antes.
 */
export class InvalidImageError extends MediaUnavailableError {
  constructor(readonly status: number, cause?: unknown) {
    super(cause);
    this.name = "InvalidImageError";
    this.message =
      "Una de las fotos no fue aceptada (formato o tamaño no válido). Cámbiala por otra o vuelve a tomarla e inténtalo de nuevo.";
  }
}

/** Deja constancia (tabla debug_logs, contexto upload_imagen) de por que fallo una subida; sin datos personales. */
function registrarFalloSubida(uri: string, error: unknown) {
  try {
    const ext = (uri.split("?")[0].split(".").pop() || "").toLowerCase().slice(0, 6);
    const e = error as { message?: string; status?: number; cause?: any } | null;
    supabase
      .from("debug_logs")
      .insert({
        contexto: "upload_imagen",
        payload: {
          mensaje: String(e?.cause?.message ?? e?.message ?? error).slice(0, 300),
          estado: e?.status ?? null,
          ext,
          plataforma: Platform.OS,
          version: String(Platform.Version),
          ts: new Date().toISOString(),
        },
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // diagnostico: nunca debe afectar la subida
  }
}

/** Ancho máximo de una foto subida. Ver `compressForUpload`. */
const MAX_IMAGE_WIDTH = 1920;

/**
 * Comprime una foto antes de subirla.
 *
 * La galería entrega el original de la cámara: 2-4 MB por foto. Al publicar una
 * propiedad con 5-15 fotos eso son decenas de MB por una subida móvil, cada
 * imagen se pasaba del límite de 30 s y fallaban TODAS ("No se pudo subir
 * ninguna imagen"). A 1920px/0.8 quedan ~300-500 KB sin perder calidad visible
 * —el servidor las recomprime igual— y suben varias veces más rápido.
 *
 * Si la foto ya es más angosta no se reescala (`resize` también AMPLÍA). Si algo
 * falla, se sube el original: comprimir nunca debe impedir publicar.
 */
async function compressForUpload(uri: string): Promise<string> {
  if (/^https?:/i.test(uri)) return uri;

  try {
    const width = await new Promise<number>((resolve) =>
      RNImage.getSize(
        uri,
        (w) => resolve(w),
        () => resolve(0),
      ),
    );
    const actions =
      width > MAX_IMAGE_WIDTH ? [{ resize: { width: MAX_IMAGE_WIDTH } }] : [];

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return result.uri;
  } catch (err) {
    log.warn("No se pudo comprimir la imagen, se sube el original:", err);
    return uri;
  }
}

export async function uploadImage(
  uri: string,
  folder:
    | "posts"
    | "perfiles"
    | "mensajes"
    | "propiedades"
    | "comentarios"
    | "reels",
  retries = 3,
): Promise<string> {
  // Una sola vez, fuera del bucle: los reintentos reusan la versión comprimida.
  const uploadUri = await compressForUpload(uri);

  let attempt = 0;
  while (attempt < retries) {
    try {
      const formData = new FormData();

      formData.append("image", {
        uri: uploadUri,
        type: "image/jpeg",
        name: `image-${Date.now()}.jpg`,
      } as any);

      formData.append("folder", folder);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), IMAGE_UPLOAD_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(`${VIDEO_API_URL}/upload-image`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        // Si es error 5xx, reintentamos
        if (response.status >= 500 && attempt < retries - 1) {
          log.warn(
            `Upload failed with status ${response.status}. Retrying (${
              attempt + 1
            }/${retries})...`,
          );
          attempt++;
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        // REV14-06: 400 / 413 / 415 / 422 significan que el servidor no acepto ESE archivo (formato o tamano). Otros
        // errores (401, 403, 404, 5xx...) siguen siendo falla del servicio y conservan el aviso generico.
        if ([400, 413, 415, 422].includes(response.status)) {
          throw new InvalidImageError(response.status);
        }
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      const url = data.url || data.image_url;
      if (!url) throw new Error("Upload response without url");
      return url;
    } catch (error: any) {
      log.error(
        `Error uploading image (attempt ${attempt + 1}/${retries}):`,
        error,
      );

      if (error?.name === "InvalidImageError") {
        registrarFalloSubida(uri, error);
        throw error;
      }

      if (attempt >= retries - 1) {
        registrarFalloSubida(uri, error);
        throw new MediaUnavailableError(error);
      }

      // Reintentar en caso de error de red o timeout
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new MediaUnavailableError();
}

export async function uploadMultipleImages(
  uris: string[],
  folder: "posts" | "propiedades" | "comentarios",
): Promise<string[]> {
  const uploadPromises = uris.map((uri) => uploadImage(uri, folder));
  return await Promise.all(uploadPromises);
}

export async function uploadVideo(
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<{ videoUrl: string; thumbnailUrl?: string }> {
  try {
    const formData = new FormData();

    formData.append("video", {
      uri,
      type: "video/mp4",
      name: `reel-${Date.now()}.mp4`,
    } as any);
    formData.append("quality", "low"); // Changed to low for faster processing
    formData.append("maxWidth", "720"); // Changed to 720 for mobile optimization
    formData.append("type", "reels");

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const xhr = new XMLHttpRequest();
      log.debug(`🚀 Starting video upload and processing...`);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });
      xhr.addEventListener("load", () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            log.debug(`✅ Video processed successfully in ${duration}s`);
            const response = JSON.parse(xhr.responseText);
            if (!(response.videoUrl || response.video_url)) {
              reject(new MediaUnavailableError(new Error("Response without videoUrl")));
              return;
            }
            resolve({
              videoUrl: response.videoUrl || response.video_url,
              thumbnailUrl: response.thumbnailUrl || undefined,
            });
          } else {
            log.error(
              `❌ Upload failed after ${duration}s with status ${xhr.status}: ${xhr.responseText}`,
            );
            reject(new MediaUnavailableError(new Error(`HTTP ${xhr.status}`)));
          }
        } catch (e: any) {
          log.error(`❌ Error parsing server response after ${duration}s:`, e);
          reject(new MediaUnavailableError(e));
        }
      });
      xhr.addEventListener("error", () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log.error(`❌ Network error after ${duration}s`);
        reject(new MediaUnavailableError(new Error("network")));
      });
      xhr.addEventListener("timeout", () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log.error(`❌ Timeout after ${duration}s`);
        reject(new MediaUnavailableError(new Error("timeout")));
      });
      xhr.addEventListener("abort", () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log.debug(`⏹️ Upload aborted after ${duration}s`);
        reject(new Error("La subida fue cancelada"));
      });
      xhr.open("POST", `${VIDEO_API_URL}/process-video`);
      xhr.timeout = 180000; // Increased to 3 minutes for slow processing
      xhr.send(formData);
    });
  } catch (error) {
    log.error("Error uploading video to R2:", error);
    throw error;
  }
}
