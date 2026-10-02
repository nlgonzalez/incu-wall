/** Uploads bytes to a Supabase signed upload URL exactly as the browser does (no API key). */
export async function putToSignedUrl(
  signedUrl: string,
  body: Uint8Array | Blob,
  contentType = "image/jpeg",
): Promise<Response> {
  return fetch(signedUrl, {
    method: "PUT",
    headers: { "content-type": contentType, "x-upsert": "false" },
    body: body instanceof Blob ? body : new Blob([body as BlobPart], { type: contentType }),
  });
}
