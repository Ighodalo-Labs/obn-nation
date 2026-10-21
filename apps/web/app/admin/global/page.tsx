import { notFound } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { GlobalView } from '@/components/admin/GlobalView';
import { requireAdmin } from '@/lib/admin/guard';
import type { FeedRow } from '@/lib/admin/inbox';
import type { AdminRow, AuditRow } from '@/lib/admin/overview';
import { publicEnv } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Global · OBN NATION' };

/** Global Admin only. Everyone else sees "not found", as if the page does not exist. */
export default async function GlobalPage() {
  const { db, me } = await requireAdmin('/admin/global');
  if (me.role !== 'global_admin') notFound();

  const [admins, feed, audit] = await Promise.all([
    db.from('profiles').select('id, full_name, phone, role, region, is_active, is_blacklisted, referral_code, status_reason, updated_at').in('role', ['regional_admin', 'global_admin']).order('created_at'),
    db.from('regional_listings_feed').select('*').order('submitted_at', { ascending: false }).limit(300),
    db.from('audit_log').select('id, actor_id, action, detail, created_at').order('id', { ascending: false }).limit(200),
  ]);

  return (
    <AdminShell current="global" me={{ name: me.name, role: me.role, region: me.region }}>
      <GlobalView
        siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL}
        admins={(admins.data ?? []) as AdminRow[]}
        listings={(feed.data ?? []) as FeedRow[]}
        audit={(audit.data ?? []) as AuditRow[]}
      />
    </AdminShell>
  );
}
