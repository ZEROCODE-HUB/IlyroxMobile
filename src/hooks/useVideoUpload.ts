import { useState } from "react";
import { uploadVideo as uploadVideoService } from "../services/uploadService";
import { logger } from "@/utils/logger";const log = logger.scoped("useVideoUpload");

export const useVideoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload a video to the processing service
   * @param videoUri URI of the video to upload
   * @param bucket Kept for backward compatibility (ignored)
   * @param folder Kept for backward compatibility (ignored)
   * @returns Object with videoUrl and optionally thumbnailUrl, or null if failed
   */
  const MAX_UPLOAD_RETRIES = 3;

  const uploadVideo = async (
    videoUri: string,
    bucket: string = "feed-images",
    folder: string = "reels",
  ): Promise<{ videoUrl: string; thumbnailUrl?: string } | null> => {
    // Si la URI ya es una URL remota, retornarla directamente.
    if (videoUri.startsWith("http") || videoUri.startsWith("https")) {
      setUploadProgress(100);
      return { videoUrl: videoUri };
    }

    setUploading(true);
    setUploadProgress(0);

    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt++) {
      try {
        log.debug(`📤 Upload attempt ${attempt}/${MAX_UPLOAD_RETRIES}...`);
        setUploadProgress(0);

        const result = await uploadVideoService(videoUri, (progress) => {
          setUploadProgress(Math.min(Math.round(progress), 99));
        });

        setUploadProgress(100);
        setUploading(false);
        return result;
      } catch (err) {
        lastError = err;
        log.warn(
          `⚠️ Upload attempt ${attempt}/${MAX_UPLOAD_RETRIES} failed:`,
          err,
        );

        if (attempt < MAX_UPLOAD_RETRIES) {
          // Esperar 1 segundo antes de reintentar
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    log.error(
      `❌ Video upload failed after ${MAX_UPLOAD_RETRIES} attempts:`,
      lastError,
    );
    setUploading(false);
    setTimeout(() => setUploadProgress(0), 1000);
    return null;
  };

  /**
   * Upload multiple videos
   */
  const uploadVideos = async (
    videoUris: string[],
    bucket: string = "feed-images",
    folder: string = "reels",
  ): Promise<string[]> => {
    if (!videoUris || videoUris.length === 0) return [];

    const uploadedUrls: string[] = [];
    for (const uri of videoUris) {
      const result = await uploadVideo(uri, bucket, folder);
      if (result) {
        uploadedUrls.push(result.videoUrl);
      }
    }
    return uploadedUrls;
  };

  return { uploadVideo, uploadVideos, uploading, uploadProgress };
};
