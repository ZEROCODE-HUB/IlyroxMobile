import { useState } from "react";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { decode } from "base64-arraybuffer";

export const useImageUpload = () => {
  const [uploading, setUploading] = useState(false);

  /**
   * Upload a single image to Supabase Storage
   * @param imageUri URI of the image to upload
   * @param bucket Bucket name (default: 'feed-images')
   * @param folder Folder path within the bucket (default: 'uploads')
   * @returns Public URL of the uploaded image or null if failed
   */
  const uploadImage = async (
    imageUri: string,
    bucket: string = "feed-images",
    folder: string = "uploads"
  ): Promise<string | null> => {
    try {
      setUploading(true);
      let fileBody: string | Blob | ArrayBuffer;

      // Handle Web vs Native file reading
      if (Platform.OS === "web") {
        if (imageUri.startsWith("blob:") || imageUri.startsWith("http")) {
          const response = await fetch(imageUri);
          fileBody = await response.blob();
        } else if (imageUri.startsWith("data:")) {
          // Handle base64 data URI if present
          const base64Data = imageUri.split(",")[1];
          fileBody = decode(base64Data);
        } else {
          fileBody = imageUri;
        }
      } else {
        // Read file as Base64 on Native
        const { readAsStringAsync } = require("expo-file-system/legacy");
        const base64 = await readAsStringAsync(imageUri, {
          encoding: "base64",
        });
        fileBody = decode(base64);
      }

      // Generate unique filename
      const fileName = `${folder}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.jpg`;
      const filePath = `${folder}/${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBody, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Error uploading image:", err);
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
    folder: string = "uploads"
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
