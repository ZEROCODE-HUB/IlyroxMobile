import { useState } from "react";
import { Platform } from "react-native";
import { supabase } from "../../lib/supabase";
import { decode } from "base64-arraybuffer";

export const useVideoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload a video to Supabase Storage
   * @param videoUri URI of the video to upload
   * @param bucket Bucket name (default: 'feed-videos')
   * @param folder Folder path within the bucket (default: 'reels')
   * @returns Public URL of the uploaded video or null if failed
   */
  const uploadVideo = async (
    videoUri: string,
    bucket: string = "feed-images",
    folder: string = "reels",
  ): Promise<string | null> => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUploading(true);
      setUploadProgress(0);

      // Si la URI ya es una URL remota (ej. Supabase), retornarla directamente sin resubir.
      if (videoUri.startsWith("http") || videoUri.startsWith("https")) {
        console.log("ℹ️ Video ya está en la nube, saltando subida.");
        setUploadProgress(100);
        return videoUri;
      }

      let fileBody: string | Blob | ArrayBuffer;
      let contentType = "video/mp4";

      // Detect video type from URI
      if (videoUri.includes(".mov")) {
        contentType = "video/quicktime";
      } else if (videoUri.includes(".avi")) {
        contentType = "video/x-msvideo";
      } else if (videoUri.includes(".webm")) {
        contentType = "video/webm";
      }

      // Handle Web vs Native file reading
      if (Platform.OS === "web") {
        if (videoUri.startsWith("blob:") || videoUri.startsWith("http")) {
          const response = await fetch(videoUri);
          fileBody = await response.blob();
        } else if (videoUri.startsWith("data:")) {
          const base64Data = videoUri.split(",")[1];
          fileBody = decode(base64Data);
        } else {
          fileBody = videoUri;
        }
      } else {
        // Read file as Base64 on Native
        const { readAsStringAsync } = require("expo-file-system/legacy");
        setUploadProgress(10);

        const base64 = await readAsStringAsync(videoUri, {
          encoding: "base64",
        });

        setUploadProgress(30);

        fileBody = decode(base64);

        setUploadProgress(50);
      }

      // Generate unique filename with proper extension
      const extension = contentType === "video/quicktime" ? "mov" : "mp4";
      const fileName = `${folder}${Date.now()}${Math.random()
        .toString(36)
        .substring(7)}.${extension}`;
      const filePath = `${folder}/${fileName}`;

      setUploadProgress(60);

      console.log("📤 Subiendo a Supabase Storage...");
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBody, {
          contentType,
          upsert: false,
        });

      console.log("📊 Respuesta de Supabase:", { data, error });

      if (error) {
        console.error("❌ ERROR AL SUBIR:", error);
        throw error;
      }

      console.log("✅ Video subido exitosamente");
      setUploadProgress(90);

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      console.log("🔗 URL pública generada:", urlData.publicUrl);

      setUploadProgress(100);
      console.log("🎉 === UPLOAD COMPLETADO ===");

      return urlData.publicUrl;
    } catch (err) {
      console.error("💥 ERROR GENERAL:", err);
      console.error("💥 Error completo:", JSON.stringify(err, null, 2));
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
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

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const uri of videoUris) {
        const url = await uploadVideo(uri, bucket, folder);
        if (url) {
          uploadedUrls.push(url);
        }
      }
      return uploadedUrls;
    } finally {
      setUploading(false);
    }
  };

  return { uploadVideo, uploadVideos, uploading, uploadProgress };
};
