import { ApiError } from '@/lib/api/errors';
import { handle, ok, readJson, requireSameOrigin } from '@/lib/api/http';
import { reissueLink, reissueSchema } from '@/lib/admin/reject';
import { buildRejectDeps } from '@/lib/admin/reject-deps';
import { publicEnv } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export const POST = handle(async (req) => {
  requireSameOrigin(req, new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin);
  const { listing_id } = await readJson(req, reissueSchema);
  const { data: auth } = await createServerSupabase().auth.getUser();
  if (!auth.user) throw new ApiError('unauthenticated');
  return ok(await reissueLink(buildRejectDeps(), auth.user.id, listing_id));
});
