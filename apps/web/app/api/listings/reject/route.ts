import { ApiError } from '@/lib/api/errors';
import { handle, ok, readJson, requireSameOrigin } from '@/lib/api/http';
import { rejectListing, rejectSchema } from '@/lib/admin/reject';
import { buildRejectDeps } from '@/lib/admin/reject-deps';
import { publicEnv } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** The session proves who the admin is. The database function checks that this admin may reject this listing. */
export const POST = handle(async (req) => {
  requireSameOrigin(req, new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin);
  const body = await readJson(req, rejectSchema);
  const { data: auth } = await createServerSupabase().auth.getUser();
  if (!auth.user) throw new ApiError('unauthenticated');
  return ok(await rejectListing(buildRejectDeps(), auth.user.id, body));
});
