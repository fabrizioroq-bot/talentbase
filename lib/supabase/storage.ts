import { randomUUID } from "crypto";
import { CV_BUCKET, getSupabaseAdmin } from "./server";

/**
 * Uploads a CV file to the private `cv-files` bucket and returns the storage
 * path (not a public URL — the bucket is private; use getSignedFileUrl to
 * generate a temporary viewing link).
 */
export async function uploadCvFile(params: {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}): Promise<{ path: string }> {
  const supabase = getSupabaseAdmin();
  const safeName = params.fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from(CV_BUCKET)
    .upload(path, params.buffer, {
      contentType: params.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file to storage: ${error.message}`);
  }

  return { path };
}

export async function getSignedFileUrl(path: string, expiresInSeconds = 60 * 10): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

export async function deleteCvFile(path: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.storage.from(CV_BUCKET).remove([path]);
}
