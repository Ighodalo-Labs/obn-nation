import { handle, ok, readJson, requireSameOrigin } from '@/lib/api/http';
import { ApiError } from '@/lib/api/errors';
import { publicEnv } from '@/lib/env';
import { readSubscription, subscribeBody, tooMany } from '@/lib/newsletter';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export const POST = handle(async (req) => {
  requireSameOrigin(req, new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin);
  const who = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (tooMany(who)) throw new ApiError('rate_limited', 'Too many tries. Please wait a while and try again.', { retry_after_seconds: 3600 });
  const r = readSubscription(await readJson(req, subscribeBody));
  if (r.kind === 'ignore') return ok({ subscribed: true }); // a bot: look happy, store nothing
  if (r.kind === 'invalid') throw new ApiError('validation_failed', r.message, { fields: [{ field: r.field, reason: r.message }] });
  const { error } = await createAdminSupabase().rpc('newsletter_subscribe', {
    p_email: r.email, p_phone: r.phone, p_wants_email: r.wantsEmail, p_wants_sms: r.wantsSms,
  });
  if (error) throw new Error(`database call failed: ${error.message}`);
  return ok({ subscribed: true });
});
