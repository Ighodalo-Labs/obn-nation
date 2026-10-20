import { ApiError } from '@/lib/api/errors';
import { handle, ok, readJson, requireSameOrigin } from '@/lib/api/http';
import { decide, decideSchema } from '@/lib/admin/decide';
import { publicEnv } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Claim or approve. Runs as the signed-in admin, so the database checks the role, region and who was first. */
export const POST = handle(async (req) => {
  requireSameOrigin(req, new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin);
  const body = await readJson(req, decideSchema);
  const db = createServerSupabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) throw new ApiError('unauthenticated');
  return ok(
    await decide(
      { call: async (fn, id) => (await db.rpc(fn, { p_listing: id })).error },
      body,
    ),
  );
});
