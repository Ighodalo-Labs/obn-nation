import 'server-only';
import { hashToken } from '@/lib/edit-token';
import { createAdminSupabase } from '@/lib/supabase/admin';
import type { EditDeps, EditListing } from './core';

/** Real dependencies for the token-gated edit page. Service role, used only after the token is checked. */
export function buildEditDeps(): EditDeps {
  const admin = createAdminSupabase();
  return {
    hash: hashToken,
    getForEdit: async (hash) => {
      const { data, error } = await admin.rpc('get_listing_for_edit', { p_token_hash: hash });
      return { data: (data as EditListing | null) ?? null, error };
    },
    resubmitCount: async (id) => {
      const { data } = await admin.from('listings').select('resubmit_count').eq('id', id).maybeSingle();
      return data?.resubmit_count ?? 0;
    },
    signedUpload: async (bucket, path) => {
      const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
      return error || !data ? null : { signedUrl: data.signedUrl, token: data.token };
    },
    listFiles: async (bucket, folder) => {
      const { data } = await admin.storage.from(bucket).list(folder, { limit: 100 });
      return (data ?? []).map((o) => o.name);
    },
    resubmit: async (hash, fields) => {
      const { data, error } = await admin.rpc('resubmit_listing', { p_token_hash: hash, p_fields: fields });
      return { id: typeof data === 'string' ? data : null, error };
    },
  };
}

export async function signMedia(paths: { photos: string[]; video: string | null }) {
  const admin = createAdminSupabase();
  const photos = paths.photos.length ? (await admin.storage.from('photos').createSignedUrls(paths.photos, 3600)).data ?? [] : [];
  const video = paths.video ? (await admin.storage.from('videos').createSignedUrl(paths.video, 3600)).data?.signedUrl ?? null : null;
  const byPath: Record<string, string> = {};
  for (const p of photos) if (p.path && p.signedUrl) byPath[p.path] = p.signedUrl;
  return { photos: byPath, video };
}
