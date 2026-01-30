import { useState } from "react";
import { uploadImage as uploadImageService } from "../../services/uploadService";

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);

  /**
   * Upload a single image using the upload service
   * @param imageUri URI of the image to upload
   * @param bucket Kept for backward compatibility (ignored)
   * @param folder Folder path within the service (default: 'uploads')
   * @returns Public URL of the uploaded image or null if failed
   */
  const uploadImage = async (
    imageUri: string,
    bucket: string = "feed-images",
    folder: any = "uploads",
  ): Promise<string | null> => {
    try {
      setUploading(true);

      // Si ya es una URL remota, no subir
      if (imageUri.startsWith("http") || imageUri.startsWith("https")) {
        return imageUri;
      }

      // El servicio espera carpetas específicas, mapeamos si es necesario
      let serviceFolder: any = folder;
      if (folder === "uploads") serviceFolder = "posts";
      if (folder === "properties") serviceFolder = "propiedades";

      const url = await uploadImageService(imageUri, serviceFolder);
      return url;
    } catch (err) {
      console.error("Error uploading image with service:", err);
      return null;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Upload multiple images
   */
  const uploadImages = async (
    imageUris: string[],
    bucket: string = "feed-images",
    folder: any = "uploads",
  ): Promise<string[]> => {
    if (!imageUris || imageUris.length === 0) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const uri of imageUris) {
        const url = await uploadImage(uri, bucket, folder);
        if (url) {
          uploadedUrls.push(url);
        }
      }
      return uploadedUrls;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploadImages, uploading };
};
