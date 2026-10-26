import { z } from 'zod';
import { handle, ok } from '@/lib/api/http';
import { ApiError } from '@/lib/api/errors';
import { serverEnv } from '@/lib/env';
import { linkIsDone } from '@/lib/telegram-deps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nonce = z.string().regex(/^[0-9a-f]{32}$/);

/** The sign-in page asks "did the Telegram link finish?". The one-time code is the secret, so no session is needed. */
export const GET = handle(async (req) => {
  serverEnv();
  const parsed = nonce.safeParse(new URL(req.url).searchParams.get('nonce'));
  if (!parsed.success) throw new ApiError('validation_failed', undefined, { fields: [{ field: 'nonce', reason: 'invalid' }] });
  return ok({ linked: await linkIsDone(parsed.data) }, { headers: { 'Cache-Control': 'no-store' } });
});
