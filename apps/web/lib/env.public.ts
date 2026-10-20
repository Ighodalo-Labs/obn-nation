import { z } from 'zod';

const url = z.string().url();
const secret = (min: number) => z.string().min(min, `must be at least ${min} characters`);

/** Safe for the browser. Only NEXT_PUBLIC_ names belong here. */
export const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: secret(20),
  NEXT_PUBLIC_SITE_URL: url,
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type Source = Record<string, string | undefined>;

export class EnvError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Bad or missing environment variables:\n- ${problems.join('\n- ')}\nCopy .env.example to .env.local and fill it in.`);
    this.name = 'EnvError';
  }
}

export function parse<T extends z.ZodTypeAny>(schema: T, source: Source): z.infer<T> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  throw new EnvError(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
}

export function parsePublicEnv(source: Source): PublicEnv {
  return parse(publicSchema, source);
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
