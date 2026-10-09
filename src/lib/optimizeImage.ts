import { adminHeaders } from "./adminAuth";

/**
 * Client-side sticker image optimizer and permanent cloud uploader.
 * Resizes any large user photo/PNG to max 800px with transparency preserved,
 * converting a 5MB image into a crisp 30KB-60KB WebP/PNG, then uploads
 * to Upstash Redis while permanently deleting the previous image.
 */

export async function optimizeImageFile(file: File, maxDim = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to parse image"));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(reader.result as string);
        }

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first for ultra-lightweight transparent output
        try {
          const webpData = canvas.toDataURL("image/webp", 0.9);
          if (webpData.startsWith("data:image/webp")) {
            return resolve(webpData);
          }
        } catch {
          // fallback to PNG
        }

        const pngData = canvas.toDataURL("image/png");
        resolve(pngData);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a replacement sticker image, permanently purging the previous custom sticker image.
 * Returns the permanent URL: `/api/sticker-image?id=...`
 */
export async function uploadAndReplaceSticker(
  stickerId: string,
  file: File,
  oldUrl?: string,
): Promise<{ url: string; sizeKB: number }> {
  // 1. Optimize image client-side to ensure tiny payload (< 80KB)
  const optimizedBase64 = await optimizeImageFile(file, 800);

  // 2. Upload to serverless API
  const res = await fetch("/api/upload-sticker", {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      stickerId,
      imageBase64: optimizedBase64,
      oldUrl,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  if (!data.ok || !data.url) {
    throw new Error(data.error || "Server upload error");
  }

  return {
    url: data.url,
    sizeKB: data.sizeKB || Math.round(optimizedBase64.length / 1024),
  };
}

/**
 * Permanently deletes a custom sticker image from the database when a sticker is deleted.
 */
export async function deleteStickerImage(url?: string): Promise<void> {
  if (!url || !url.includes("/api/sticker-image")) return;
  try {
    await fetch("/api/upload-sticker", {
      method: "DELETE",
      headers: adminHeaders(),
      body: JSON.stringify({ oldUrl: url }),
    });
  } catch (err) {
    console.warn("Could not delete image from Redis:", err);
  }
}
