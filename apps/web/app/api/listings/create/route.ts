import { cookies } from 'next/headers';
import { ApiError, mapDbError } from '@/lib/api/errors';
import { handle, ok, readJson, requireSameOrigin } from '@/lib/api/http';
import { publicEnv } from '@/lib/env';
import { createBodySchema, createOrSubmit, type CreateDeps, type ListingRow } from '@/lib/listing/create';
import { REF_COOKIE, validRef } from '@/lib/middleware/rules';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const COLS = 'id, status, submitted_at';

function fail(error: { code?: string; message?: string }, blocked = false): never {
  if (blocked && error.code === '42501') throw new ApiError('account_blocked'); // row level security refuses revoked or blacklisted accounts
  throw mapDbError(error) ?? new ApiError('internal_error');
}

/** Real database calls, made as the signed-in seller so row level security applies. */
function buildDeps(): CreateDeps {
  const db = createServerSupabase();
  return {
    findByKey: async (sellerId, clientKey) => {
      const { data, error } = await db.from('listings').select(COLS).eq('seller_id', sellerId).eq('client_key', clientKey).maybeSingle();
      if (error) fail(error);
      return (data as ListingRow | null) ?? null;
    },
    insertDraft: async (row) => {
      const { data, error } = await db.from('listings').insert({ ...row, status: 'draft' }).select(COLS).single();
      if (error) fail(error, true);
      return data as ListingRow;
    },
    updateDraft: async (id, f) => {
      const { error } = await db.from('listings').update(f).eq('id', id).eq('status', 'draft');
      if (error) fail(error);
    },
    listFiles: async (bucket, folder) => {
      const { data, error } = await db.storage.from(bucket).list(folder, { limit: 20 });
      if (error) throw new ApiError('internal_error');
      return (data ?? []).map((o) => o.name);
    },
    submitDraft: async (id, f, photos, video) => {
      const { data, error } = await db
        .from('listings')
        .update({ ...f, photo_urls: photos, video_url: video, status: 'pending_review' })
        .eq('id', id)
        .eq('status', 'draft')
        .select(COLS)
        .maybeSingle();
      if (error) fail(error);
      return (data as ListingRow | null) ?? null;
    },
  };
}

export const POST = handle(async (req) => {
  requireSameOrigin(req, new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin);
  const body = await readJson(req, createBodySchema);
  const db = createServerSupabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new ApiError('unauthenticated');
  // The referral code comes from the cookie only. The browser never chooses the admin.
  const ref = validRef(cookies().get(REF_COOKIE)?.value);
  const result = await createOrSubmit(buildDeps(), auth.user.id, ref, body);
  return ok(result.body, { status: result.status });
});
