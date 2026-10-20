import { handle, ok, readJson, requireSameOrigin } from '@/lib/api/http';
import { buildEditDeps } from '@/lib/edit/deps';
import { resubmit, resubmitSchema } from '@/lib/edit/core';
import { publicEnv } from '@/lib/env';

export const runtime = 'nodejs';

export const POST = handle(async (req) => {
  requireSameOrigin(req, new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin);
  const body = await readJson(req, resubmitSchema);
  return ok(await resubmit(buildEditDeps(), body));
});
