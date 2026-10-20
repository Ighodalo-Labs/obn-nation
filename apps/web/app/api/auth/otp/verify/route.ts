import { z } from 'zod';
import { handle, ok, readJson, requireSameOrigin } from '@/lib/api/http';
import { buildOtpDeps } from '@/lib/auth/deps';
import { verifyCode } from '@/lib/auth/otp';
import { publicEnv, serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

const body = z.object({
  phone: z.string().trim().min(1).max(30),
  code: z.string().trim().regex(/^\d{6}$/, 'The code has 6 digits'),
  next: z.string().max(200).optional(),
});

export const POST = handle(async (req) => {
  requireSameOrigin(req, new URL(publicEnv().NEXT_PUBLIC_SITE_URL).origin);
  serverEnv();
  const { phone, code, next } = await readJson(req, body);
  return ok(await verifyCode(buildOtpDeps(), phone, code, next));
});
