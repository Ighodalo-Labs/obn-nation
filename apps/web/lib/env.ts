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

/** Server only. Never import serverEnv from a client component. */
const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: secret(20),
  SEND_SMS_HOOK_SECRET: secret(16),
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC', 'must start with AC'),
  TWILIO_AUTH_TOKEN: secret(16),
  TWILIO_WHATSAPP_FROM: e164,
  TWILIO_OTP_CONTENT_SID: z.string().startsWith('HX', 'must start with HX'),
  TWILIO_REJECT_CONTENT_SID: z.string().startsWith('HX', 'must start with HX'),
  CRON_SECRET: secret(16),
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
