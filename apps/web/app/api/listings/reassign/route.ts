import { ApiError } from '@/lib/api/errors';
import { handle, ok, readJson, requireSameOrigin } from '@/lib/api/http';
import { reassignListing, reassignSchema } from '@/lib/admin/global';
import { buildGlobalDeps } from '@/lib/admin/global-deps';
import { publicEnv } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Global Admin only. The database function checks the role again. */
export const POST = handle(async (req) => {
  requireSameOrigin(req, new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin);
  const body = await readJson(req, reassignSchema);
  const { data: auth } = await createServerSupabase().auth.getUser();
  if (!auth.user) throw new ApiError('unauthenticated');
  return ok(await reassignListing(buildGlobalDeps(), body));
});
