import { z } from 'zod';
import { parse, publicSchema, type Source } from './env.public';

// Public values live in env.public.ts so the browser bundle never contains server variable names.
export { EnvError, parsePublicEnv, publicEnv, type PublicEnv } from './env.public';

/** Nigerian E.164 sender, for example +2347072767227 */
const e164 = z.string().regex(/^\+\d{10,15}$/, 'must be in international format, like +2347072767227');
const secret = (min: number) => z.string().min(min, `must be at least ${min} characters`);

/**
 * Server only. Never import serverEnv from a client component.
 * WHATSAPP_MODE=stub skips Twilio (no message is sent and no code is logged). Use it until Meta approves the templates.
 * With a stub, testers sign in with the fixed codes set under "Phone test OTPs" in the Supabase dashboard.
 */
const serverSchema = publicSchema
  .extend({
    SUPABASE_SERVICE_ROLE_KEY: secret(20),
    SEND_SMS_HOOK_SECRET: secret(16),
    CRON_SECRET: secret(16),
    WHATSAPP_MODE: z.enum(['live', 'stub']).default('live'),
    TWILIO_ACCOUNT_SID: z.string().startsWith('AC', 'must start with AC').optional(),
    TWILIO_AUTH_TOKEN: secret(16).optional(),
    TWILIO_WHATSAPP_FROM: e164.optional(),
    TWILIO_OTP_CONTENT_SID: z.string().startsWith('HX', 'must start with HX').optional(),
    TWILIO_REJECT_CONTENT_SID: z.string().startsWith('HX', 'must start with HX').optional(),
  })
  .superRefine((env, ctx) => {
    if (env.WHATSAPP_MODE !== 'live') return;
    for (const key of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM', 'TWILIO_OTP_CONTENT_SID', 'TWILIO_REJECT_CONTENT_SID'] as const) {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'is required when WHATSAPP_MODE is live' });
    }
  });

export type ServerEnv = z.infer<typeof serverSchema>;

export function parseServerEnv(source: Source): ServerEnv {
  return parse(serverSchema, source);
}

let cached: ServerEnv | undefined;
export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') throw new Error('serverEnv() was called in the browser.');
  return (cached ??= parseServerEnv(process.env));
}
