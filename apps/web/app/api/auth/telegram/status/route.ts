import { z } from 'zod';
import { handle, ok } from '@/lib/api/http';
import { ApiError } from '@/lib/api/errors';
import { serverEnv } from '@/lib/env';
import { chatIdForPhone, linkIsDone } from '@/lib/telegram-deps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nonce = z.string().regex(/^[0-9a-f]{32}$/);
const phone = z.string().regex(/^\+234\d{10}$/);

/** The sign-in page asks "did the Telegram link finish?". The one-time code is the secret, so no session is needed. */
export const GET = handle(async (req) => {
  serverEnv();
  const parsed = nonce.safeParse(new URL(req.url).searchParams.get('nonce'));
  if (!parsed.success) throw new ApiError('validation_failed', undefined, { fields: [{ field: 'nonce', reason: 'invalid' }] });
  // Linked if this code finished, or if the number is linked by any code. The send route already tells anyone whether a number needs linking, so this shows nothing new.
  const p = phone.safeParse(new URL(req.url).searchParams.get('phone'));
  const linked = (await linkIsDone(parsed.data)) || (p.success && (await chatIdForPhone(p.data)) !== null);
  return ok({ linked }, { headers: { 'Cache-Control': 'no-store' } });
});
