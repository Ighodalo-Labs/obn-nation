import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { parseServerEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** TEMPORARY set-up check. Shows only variable names and yes/no results, never a value. Remove after the live run works. */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('probe')) {
    const db = createServerSupabase();
    const u = await db.auth.getUser();
    const out: Record<string, string> = { user: u.data.user ? 'signed in' : 'no session' };
    const q = async (name: string, f: () => PromiseLike<{ error: { code?: string; message: string } | null }>) => {
      const r = await f();
      out[name] = r.error ? `${r.error.code ?? ''} ${r.error.message.slice(0, 140)}` : 'ok';
    };
    await q('select_profiles', () => db.from('profiles').select('id').limit(1));
    await q('select_listings', () => db.from('listings').select('id').limit(1));
    await q('rpc_is_usable', () => db.rpc('is_usable'));
    await q('rpc_my_role', () => db.rpc('my_role'));
    return NextResponse.json(out);
  }
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
