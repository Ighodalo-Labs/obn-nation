import { z } from 'zod';
import { parse, publicSchema, type Source } from './env.public';

// Public values live in env.public.ts so the browser bundle never contains server variable names.
export { EnvError, parsePublicEnv, publicEnv, type PublicEnv } from './env.public';

/** Nigerian E.164 sender, for example +2347072767227 */
const e164 = z.string().regex(/^\+\d{10,15}$/, 'must be in international format, like +2347072767227');
const secret = (min: number) => z.string().min(min, `must be at least ${min} characters`);

/**
 * Server only. Never import serverEnv from a client component.
 * NEXT_PUBLIC_MESSAGE_CHANNEL picks where codes and rejection links go: whatsapp (Twilio) or telegram (bot). Default whatsapp (doc 11).
 * TELEGRAM_MODE=stub skips the bot the same way. WHATSAPP_MODE=stub skips Twilio (no message is sent and no code is logged). Use it until Meta approves the templates.
 * With a stub, testers sign in with the fixed codes set under "Phone test OTPs" in the Supabase dashboard.
 */
const serverSchema = publicSchema
  .extend({
    SUPABASE_SERVICE_ROLE_KEY: secret(20),
    SEND_SMS_HOOK_SECRET: secret(16),
    CRON_SECRET: secret(16),
    NEXT_PUBLIC_MESSAGE_CHANNEL: z.enum(['whatsapp', 'telegram']).default('whatsapp'),
    WHATSAPP_MODE: z.enum(['live', 'stub']).default('live'),
    TELEGRAM_MODE: z.enum(['live', 'stub']).default('live'),
    TELEGRAM_BOT_TOKEN: z.string().regex(/^\d{5,}:[A-Za-z0-9_-]{20,}$/, 'must look like 123456:ABC-def… (from @BotFather)').optional(),
    TELEGRAM_WEBHOOK_SECRET: z.string().regex(/^[A-Za-z0-9_-]{16,256}$/, 'must be 16 to 256 letters, digits, _ or -').optional(),
    TELEGRAM_BOT_USERNAME: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{4,31}$/, 'bot username without @, for example obnnation_bot').optional(),
    TWILIO_ACCOUNT_SID: z.string().startsWith('AC', 'must start with AC').optional(),
    TWILIO_AUTH_TOKEN: secret(16).optional(),
    TWILIO_WHATSAPP_FROM: e164.optional(),
    TWILIO_OTP_CONTENT_SID: z.string().startsWith('HX', 'must start with HX').optional(),
    TWILIO_REJECT_CONTENT_SID: z.string().startsWith('HX', 'must start with HX').optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NEXT_PUBLIC_MESSAGE_CHANNEL === 'telegram') {
      if (env.TELEGRAM_MODE !== 'live') return;
      for (const key of ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_BOT_USERNAME'] as const) {
        if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'is required when NEXT_PUBLIC_MESSAGE_CHANNEL is telegram and TELEGRAM_MODE is live' });
      }
      return;
    }
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
