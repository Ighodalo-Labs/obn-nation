import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export interface AdminMe {
  id: string;
  role: 'regional_admin' | 'global_admin';
  region: string | null;
  name: string | null;
  referralCode: string | null;
}

/**
 * Active regional or global admins only. Everyone else, including revoked and blacklisted admins
 * (row level security hides their profile), goes to /list. The database checks again on every query.
 */
export async function requireAdmin(next: string): Promise<{ db: ReturnType<typeof createServerSupabase>; me: AdminMe }> {
  const db = createServerSupabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) redirect(`/list?next=${encodeURIComponent(next)}`);
  const { data: me } = await db.from('profiles').select('id, role, region, full_name, referral_code').eq('id', auth.user.id).maybeSingle();
  if (!me || (me.role !== 'regional_admin' && me.role !== 'global_admin')) redirect('/list');
  return { db, me: { id: me.id, role: me.role, region: me.region, name: me.full_name, referralCode: me.referral_code } };
}
