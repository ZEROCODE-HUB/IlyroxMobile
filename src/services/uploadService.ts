import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: "https://0e6635c88d6896d0b4b37d3d76bb765d.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.EXPO_PUBLIC_R2_ACCESS_KEY!,
    secretAccessKey: process.env.EXPO_PUBLIC_R2_SECRET_ACCESS_KEY!,
  },
});

const VIDEO_API_URL =
  "https://celebrated-celebration-production.up.railway.app";

export async function uploadImage(
  uri: string,
  folder:
    | "posts"
    | "perfiles"
    | "mensajes"
    | "propiedades"
    | "comentarios"
    | "reels",
): Promise<string> {
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
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data.url || data.image_url;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
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
    formData.append("quality", "medium");
    formData.append("maxWidth", "1080");
    formData.append("type", "reels");

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            videoUrl: response.videoUrl || response.video_url,
            thumbnailUrl: response.thumbnailUrl || undefined,
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.responseText}`));
        }
      });
      xhr.addEventListener("error", () => {
        reject(new Error("Network Error"));
      });
      xhr.open("POST", `${VIDEO_API_URL}/process-video`);
      xhr.send(formData);
    });
  } catch (error) {
    console.error("Error uploading video to R2:", error);
    throw error;
  }
}
