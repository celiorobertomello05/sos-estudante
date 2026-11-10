import { requireSupabase } from "../lib/supabase";

/** Buckets privados criados na migração. Nenhum arquivo é público. */
export type Bucket = "avatars" | "documents" | "delivery-proofs";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function uploadFile(bucket: Bucket, path: string, uri: string, contentType: string) {
  const response = await fetch(uri);
  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_UPLOAD_BYTES) throw new Error("BUSINESS_RULE: O arquivo deve ter até 8 MB.");
  const { error } = await requireSupabase().storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function uploadText(bucket: Bucket, path: string, text: string, contentType: string) {
  const body = new TextEncoder().encode(text);
  if (body.byteLength > MAX_UPLOAD_BYTES) throw new Error("BUSINESS_RULE: O arquivo deve ter até 8 MB.");
  const { error } = await requireSupabase().storage.from(bucket).upload(path, body, { contentType, upsert: true });
  if (error) throw error;
  return path;
}

/** Nomes dos arquivos de uma pasta (o RLS limita às pastas permitidas). */
export async function listFiles(bucket: Bucket, folder: string) {
  const { data, error } = await requireSupabase().storage.from(bucket).list(folder, { limit: 100 });
  if (error) throw error;
  return (data ?? []).map((file) => `${folder}/${file.name}`);
}

/** Links temporários (1 hora) para exibir arquivos privados. */
export async function signedUrl(bucket: Bucket, path: string) {
  const { data, error } = await requireSupabase().storage.from(bucket).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
