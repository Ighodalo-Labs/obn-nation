import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

/**
 * Supabase client for server components and route handlers.
 * Acts as the signed-in person (anon key plus session cookie), so row level security applies.
 */
export function createServerSupabase() {
  const env = publicEnv();
  const store = cookies();
  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a server component: cookies are read-only there. Middleware refreshes the session.
        }
      },
    },
  });
}
