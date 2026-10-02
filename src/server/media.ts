import "server-only";
import { inspectJpeg } from "@/lib/jpeg";
import { LIMITS } from "@/lib/validation";
import { db, MEDIA_BUCKET } from "./supabase";

export const SIGNED_URL_TTL_SECONDS = 60 * 60; // PRD: 1 hour

export function photoPath(boardSlug: string, messageId: string): string {
  return `${boardSlug}/${messageId}.jpg`;
}

export function coverPath(boardSlug: string): string {
  return `${boardSlug}/cover.jpg`;
}

export interface UploadTicket {
  signedUrl: string;
  path: string;
}

/** Signed upload URL: photo bytes go browser → Storage, never through a Vercel function. */
export async function createUploadTicket(path: string, upsert = false): Promise<UploadTicket> {
  const { data, error } = await db()
    .storage.from(MEDIA_BUCKET)
    .createSignedUploadUrl(path, { upsert });
  if (error) throw new Error(`signed upload url failed: ${error.message}`);
  return { signedUrl: data.signedUrl, path: data.path };
}

export type UploadCheck = { ok: true } | { ok: false; reason: string };

/**
 * Server-side validation of an uploaded photo: exists, ≤ 10 MB, real JPEG and without
 * EXIF/XMP metadata (AC-5). Invalid objects are deleted.
 */
export async function verifyUploadedPhoto(path: string): Promise<UploadCheck> {
  const { data, error } = await db().storage.from(MEDIA_BUCKET).download(path);
  if (error || !data) return { ok: false, reason: "No encontramos la foto subida" };

  const fail = async (reason: string): Promise<UploadCheck> => {
    await removeObjects([path]);
    return { ok: false, reason };
  };

  if (data.size > LIMITS.photoMaxBytes) return fail("La foto supera los 10 MB");
  const bytes = new Uint8Array(await data.arrayBuffer());
  const inspection = inspectJpeg(bytes);
  if (!inspection.isJpeg) return fail("El archivo no es una imagen JPEG válida");
  if (inspection.hasMetadata) return fail("La foto conserva metadatos; volvé a subirla");
  return { ok: true };
}

export async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await db().storage.from(MEDIA_BUCKET).remove(paths);
  if (error) throw new Error(`storage remove failed: ${error.message}`);
}

/** Signed read URLs (1 h) for rendering, keyed by storage path. */
export async function signedUrls(paths: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;
  const { data, error } = await db()
    .storage.from(MEDIA_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(`signed urls failed: ${error.message}`);
  for (const item of data) {
    if (item.path && item.signedUrl) result.set(item.path, item.signedUrl);
  }
  return result;
}

/** Download variant of a signed URL (the `download` param is outside the signature). */
export function asDownloadUrl(signedUrl: string, filename: string): string {
  const url = new URL(signedUrl);
  url.searchParams.set("download", filename);
  return url.toString();
}
