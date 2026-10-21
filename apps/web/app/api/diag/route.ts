import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { parseServerEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** TEMPORARY set-up check. Shows only variable names and yes/no results, never a value. Remove after the live run works. */
export async function GET() {
  const env = (() => {
    try { parseServerEnv(process.env); return []; }
    catch (e) { return (e as { problems?: string[] }).problems ?? ['unknown']; }
  })();
  const db: Record<string, string> = {};
  try {
    const admin = createAdminSupabase();
    const p = await admin.from('profiles').select('id').limit(1);
    db.profiles = p.error ? `error: ${p.error.message.slice(0, 120)}` : 'ok';
    const o = await admin.rpc('otp_state', { p_phone: '+2340000000000' });
    db.otp_state = o.error ? `error: ${o.error.message.slice(0, 120)}` : 'ok';
  } catch (e) {
    db.client = e instanceof Error ? e.message.slice(0, 160) : 'failed';
  }
  return NextResponse.json({ env_problems: env, db, whatsapp_mode: process.env.WHATSAPP_MODE ?? '(unset)', site_url_host: (() => { try { return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '').host; } catch { return '(bad)'; } })() });
}
