'use client';
import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';

/** Supabase client for client components. Uses the anon key and the signed-in session cookie. */
export function createBrowserSupabase() {
  const env = publicEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
