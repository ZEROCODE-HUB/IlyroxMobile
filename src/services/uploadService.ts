import { logger } from "@/utils/logger";

const log = logger.scoped("uploadService");

const VIDEO_API_URL = "https://video.109.205.178.162.sslip.io";

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
  let attempt = 0;
  while (attempt < retries) {
    try {
      const formData = new FormData();

      formData.append("image", {
        uri,
        type: "image/jpeg",
        name: `image-${Date.now()}.jpg`,
      } as any);

      formData.append("folder", folder);

      const response = await fetch(`${VIDEO_API_URL}/upload-image`, {
        method: "POST",
        body: formData,
      });

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
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      return data.url || data.image_url;
    } catch (error: any) {
      log.error(
        `Error uploading image (attempt ${attempt + 1}/${retries}):`,
        error,
      );

      // Si es el último intento o no es un error que queramos reintentar (opcional), lanzamos
      if (attempt >= retries - 1) {
        throw error;
      }

      // Reintentar en caso de error de red o timeout
      attempt++;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new Error("Upload failed after multiple retries");
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
            resolve({
              videoUrl: response.videoUrl || response.video_url,
              thumbnailUrl: response.thumbnailUrl || undefined,
            });
          } else {
            log.error(
              `❌ Upload failed after ${duration}s with status ${xhr.status}: ${xhr.responseText}`,
            );
            reject(new Error(`Error al subir el video: ${xhr.status}`));
          }
        } catch (e: any) {
          log.error(`❌ Error parsing server response after ${duration}s:`, e);
          reject(new Error(`Error en el formato de respuesta: ${e.message}`));
        }
      });
      xhr.addEventListener("error", () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log.error(`❌ Network error after ${duration}s`);
        reject(new Error("Error de red al subir el video"));
      });
      xhr.addEventListener("timeout", () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log.error(`❌ Timeout after ${duration}s`);
        reject(new Error("La subida tardó demasiado (Timeout)"));
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
