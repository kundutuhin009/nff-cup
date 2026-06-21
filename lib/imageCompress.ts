// Client-side image compression via canvas. Produces a JPEG data URL.
// Used BEFORE upload so we never ship full-res photos to the DB.

export interface CompressOptions {
  maxWidth: number;
  quality: number; // 0..1 JPEG quality
}

export interface CompressResult {
  dataUrl: string; // "data:image/jpeg;base64,...."
  bytes: number; // approximate decoded size of the base64 payload
}

const MAX_BASE64_BYTES = 200 * 1024; // hard reject ceiling (200KB)

// Approx byte size of a base64 data URL's payload.
export function base64Bytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  // 4 base64 chars -> 3 bytes; subtract padding.
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

export class ImageTooLargeError extends Error {
  constructor() {
    super("please use a smaller image");
    this.name = "ImageTooLargeError";
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image file."));
    };
    img.src = url;
  });
}

// Compress to <= targetBytes by scaling to maxWidth then nudging quality down.
// hardLimitBytes is the post-compression ceiling that triggers a hard reject
// (defaults to 200KB for the base64-in-DB photos; pass a larger value for
// storage-bucket uploads like sponsor banners).
export async function compressImage(
  file: File,
  opts: CompressOptions,
  targetBytes?: number,
  hardLimitBytes: number = MAX_BASE64_BYTES
): Promise<CompressResult> {
  const img = await loadImage(file);

  const scale = Math.min(1, opts.maxWidth / img.naturalWidth);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser.");
  ctx.drawImage(img, 0, 0, w, h);

  const target = targetBytes ?? hardLimitBytes;
  let quality = opts.quality;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  // Step quality down a few times if still over the soft target.
  for (let i = 0; i < 5 && base64Bytes(dataUrl) > target; i++) {
    quality = Math.max(0.4, quality - 0.1);
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  const bytes = base64Bytes(dataUrl);
  if (bytes > hardLimitBytes) {
    throw new ImageTooLargeError();
  }

  return { dataUrl, bytes };
}
