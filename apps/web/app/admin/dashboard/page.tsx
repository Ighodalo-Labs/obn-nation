import { AdminInbox } from '@/components/admin/AdminInbox';
import { AdminShell } from '@/components/admin/AdminShell';
import type { FeedRow } from '@/lib/admin/inbox';
import { referralLink } from '@/lib/admin/inbox';
import { publicEnv } from '@/lib/env';
import { requireAdmin } from '@/lib/admin/guard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Review · OBN NATION' };

/** Active regional or global admins only (PRD 6.5). Everyone else, including revoked admins, goes to /list. */
export default async function DashboardPage() {
  const { db, me } = await requireAdmin('/admin/dashboard');

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
    <AdminShell current="review" me={{ name: me.name, role: me.role, region: me.region }} reviewCount={rows.filter((r) => r.status === 'pending_review').length}>
      <AdminInbox
        me={{ id: me.id, role: me.role, region: me.region, name: me.name }}
        rows={rows}
        thumbs={thumbs}
        link={me.referralCode ? referralLink(publicEnv().NEXT_PUBLIC_SITE_URL, me.referralCode) : null}
      />
    </AdminShell>
  );
}
