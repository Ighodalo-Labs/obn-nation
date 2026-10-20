import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

/**
 * Service-role client. Bypasses row level security.
 * Use only in route handlers, only after the route has checked who is calling,
 * and only for the functions that are meant to be server-only (reject, blacklist, resubmit...).
 */
export function createAdminSupabase() {
  const env = serverEnv();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
