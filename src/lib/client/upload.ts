/** Uploads bytes straight to Supabase Storage with a server-issued signed URL. */
export async function uploadToSignedUrl(signedUrl: string, blob: Blob): Promise<void> {
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: { "content-type": "image/jpeg", "x-upsert": "false" },
    body: blob,
  });
  if (!response.ok) throw new Error("No pudimos subir la foto. Probá de nuevo.");
}
