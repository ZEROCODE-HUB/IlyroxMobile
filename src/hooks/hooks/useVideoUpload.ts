import { useState } from "react";
import { uploadVideo as uploadVideoService } from "../../services/uploadService";

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
  const uploadVideo = async (
    videoUri: string,
    bucket: string = "feed-images",
    folder: string = "reels",
  ): Promise<{ videoUrl: string; thumbnailUrl?: string } | null> => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Si la URI ya es una URL remota, retornarla directamente.
      if (videoUri.startsWith("http") || videoUri.startsWith("https")) {
        console.log("ℹ️ Video ya está en la nube, saltando subida.");
        setUploadProgress(100);
        return { videoUrl: videoUri };
      }

      console.log("📤 Subiendo video a través del servicio de video...");

      const result = await uploadVideoService(videoUri, (progress) => {
        setUploadProgress(Math.round(progress));
      });

      console.log("✅ Video subido exitosamente:", result.videoUrl);
      setUploadProgress(100);

      return result;
    } catch (err) {
      console.error("💥 ERROR AL SUBIR VIDEO:", err);
      return null;
    } finally {
      setUploading(false);
      // Pequeña espera para que la UI de carga se vea completa
      setTimeout(() => setUploadProgress(0), 1000);
    }
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
