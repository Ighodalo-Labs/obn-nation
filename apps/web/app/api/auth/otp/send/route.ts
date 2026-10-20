import { z } from 'zod';
import { handle, ok, readJson, requireSameOrigin } from '@/lib/api/http';
import { buildOtpDeps } from '@/lib/auth/deps';
import { sendCode } from '@/lib/auth/otp';
import { publicEnv, serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

const body = z.object({ phone: z.string().trim().min(1).max(30) });

export const POST = handle(async (req) => {
  requireSameOrigin(req, new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin);
  serverEnv(); // fail early and clearly if the server is not configured
  const { phone } = await readJson(req, body);
  return ok(await sendCode(buildOtpDeps(), phone));
});
