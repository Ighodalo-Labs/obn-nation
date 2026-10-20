import { redirect } from 'next/navigation';
import { AdminInbox } from '@/components/admin/AdminInbox';
import { Header } from '@/components/Header';
import type { FeedRow } from '@/lib/admin/inbox';
import { referralLink } from '@/lib/admin/inbox';
import { publicEnv } from '@/lib/env';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Review · OBN NATION' };

/** Active regional or global admins only (PRD 6.5). Everyone else, including revoked admins, goes to /list. */
export default async function DashboardPage() {
  const db = createServerSupabase();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) redirect('/list?next=%2Fadmin%2Fdashboard');
  const { data: me } = await db.from('profiles').select('id, role, region, full_name, referral_code').eq('id', auth.user.id).maybeSingle();
  if (!me || (me.role !== 'regional_admin' && me.role !== 'global_admin')) redirect('/list');

  const { data: feed } = await db
    .from('regional_listings_feed')
    .select('*')
    .order('submitted_at', { ascending: true })
    .limit(200);
  const rows = (feed ?? []) as FeedRow[];

  // One batch of signed links for the first photo of each card. The full gallery is signed when a card is opened.
  const firsts = rows.map((r) => r.photo_urls[0]).filter(Boolean);
  const thumbs: Record<string, string> = {};
  if (firsts.length > 0) {
    const { data: signed } = await db.storage.from('photos').createSignedUrls(firsts, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) thumbs[s.path] = s.signedUrl;
  }

  return (
    <main>
      <Header />
      <AdminInbox
        me={{ id: me.id, role: me.role, region: me.region, name: me.full_name }}
        rows={rows}
        thumbs={thumbs}
        link={me.referral_code ? referralLink(publicEnv().NEXT_PUBLIC_SITE_URL, me.referral_code) : null}
      />
    </main>
  );
}
