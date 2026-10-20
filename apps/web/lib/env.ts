import { z } from 'zod';

/** Nigerian E.164 sender, for example +2347072767227 */
const e164 = z.string().regex(/^\+\d{10,15}$/, 'must be in international format, like +2347072767227');
const url = z.string().url();
const secret = (min: number) => z.string().min(min, `must be at least ${min} characters`);

/** Safe for the browser. Only NEXT_PUBLIC_ names belong here. */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: secret(20),
  NEXT_PUBLIC_SITE_URL: url,
});

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

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
type Source = Record<string, string | undefined>;

export class EnvError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Bad or missing environment variables:\n- ${problems.join('\n- ')}\nCopy .env.example to .env.local and fill it in.`);
    this.name = 'EnvError';
  }
}

function parse<T extends z.ZodTypeAny>(schema: T, source: Source): z.infer<T> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  throw new EnvError(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
}

export function parsePublicEnv(source: Source): PublicEnv {
  return parse(publicSchema, source);
}

export function parseServerEnv(source: Source): ServerEnv {
  return parse(serverSchema, source);
}

/**
 * Next.js only inlines NEXT_PUBLIC_ variables when they are written out in full,
 * so the public values are listed one by one here.
 */
export function publicEnv(): PublicEnv {
  return parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
}

let cached: ServerEnv | undefined;
export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') throw new Error('serverEnv() was called in the browser.');
  return (cached ??= parseServerEnv(process.env));
}
