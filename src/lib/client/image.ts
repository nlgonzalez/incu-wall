import { ACCEPTED_PHOTO_TYPES, LIMITS } from "@/lib/validation";

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
}

export class ImageError extends Error {}

function isHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

function isAccepted(file: File): boolean {
  if (isHeic(file)) return true;
  return (ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type);
}

async function heicToJpeg(file: File): Promise<Blob> {
  // Loaded on demand: heic2any is large and touches `window` at import time.
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  return Array.isArray(out) ? out[0]! : out;
}

async function dimensions(blob: Blob): Promise<{ width: number; height: number }> {
  const bitmap = await createImageBitmap(blob);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}

/**
 * RF-05: HEIC → JPEG, resize to ≤ 2000 px, quality 0.8, re-encode through canvas which drops
 * every EXIF/XMP segment (including GPS). Output is always JPEG.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!isAccepted(file)) throw new ImageError("Formato no soportado. Usá JPG, PNG, HEIC o WebP.");
  if (file.size > LIMITS.photoMaxBytes) throw new ImageError("La foto supera los 10 MB.");

  let source: Blob = file;
  if (isHeic(file)) {
    try {
      source = await heicToJpeg(file);
    } catch {
      throw new ImageError("No pudimos leer la foto HEIC. Probá con otra o en JPG.");
    }
  }

  const { default: imageCompression } = await import("browser-image-compression");
  const asFile =
    source instanceof File ? source : new File([source], "photo.jpg", { type: "image/jpeg" });
  let blob: Blob;
  try {
    blob = await imageCompression(asFile, {
      maxWidthOrHeight: LIMITS.photoMaxSide,
      initialQuality: 0.8,
      fileType: "image/jpeg",
      maxSizeMB: 9,
      useWebWorker: true,
      preserveExif: false,
    });
  } catch {
    throw new ImageError("No pudimos procesar la foto. Probá con otra.");
  }

  const { width, height } = await dimensions(blob);
  return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
}
