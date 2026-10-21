import { AdminShell } from '@/components/admin/AdminShell';
import { PoolView } from '@/components/admin/PoolView';
import { requireAdmin } from '@/lib/admin/guard';
import type { FeedRow } from '@/lib/admin/inbox';
import { pageRange } from '@/lib/admin/pool';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pool · OBN NATION' };

/** Approved stock of the admin's region. Masking is done by the database view, so masked values never reach this page. */
export default async function PoolPage() {
  const { db, me } = await requireAdmin('/admin/pool');
  const [from, to] = pageRange(0);
  const { data } = await db
    .from('regional_listings_feed')
    .select('*')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .range(from, to);
  const rows = (data ?? []) as FeedRow[];
  const firsts = rows.map((r) => r.photo_urls[0]).filter(Boolean);
  const thumbs: Record<string, string> = {};
  if (firsts.length) {
    const { data: signed } = await db.storage.from('photos').createSignedUrls(firsts, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) thumbs[s.path] = s.signedUrl;
  }
  return (
    <AdminShell current="pool" me={{ name: me.name, role: me.role, region: me.region }}>
      <PoolView me={{ id: me.id, isGlobal: me.role === 'global_admin', region: me.region }} first={rows} firstThumbs={thumbs} />
    </AdminShell>
  );
}
