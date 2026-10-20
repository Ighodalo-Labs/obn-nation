/** Pure helpers for the admin inbox (PRD 6.5). No framework imports. */

export interface FeedRow {
  id: string;
  region: string;
  category: string;
  title: string;
  description: string;
  price_ngn: number | string;
  condition_age: string;
  condition_work: string;
  brand: string | null;
  model: string | null;
  size: string | null;
  photo_urls: string[];
  video_url: string | null;
  status: 'pending_review' | 'approved' | 'rejected';
  submitted_at: string | null;
  approved_at: string | null;
  assigned_admin_id: string | null;
  admin_in_charge_name: string | null;
  contact_visible: boolean;
  seller_name: string;
  seller_phone: string;
}

export type TabId = 'review' | 'waiting' | 'done';
export const TABS: { id: TabId; label: string }[] = [
  { id: 'review', label: 'Needs review' },
  { id: 'waiting', label: 'Waiting for seller' },
  { id: 'done', label: 'Done' },
];

/** AD-1. The feed already limits what each admin may see; this only sorts it into tabs. */
export function tabOf(row: FeedRow, me: string, isGlobal: boolean): TabId | null {
  if (row.status === 'pending_review') return 'review';
  if (row.status === 'rejected') return isGlobal || row.assigned_admin_id === me ? 'waiting' : null;
  if (row.status === 'approved') return isGlobal || row.assigned_admin_id === me ? 'done' : null;
  return null;
}

export function splitTabs(rows: FeedRow[], me: string, isGlobal: boolean): Record<TabId, FeedRow[]> {
  const out: Record<TabId, FeedRow[]> = { review: [], waiting: [], done: [] };
  for (const r of rows) {
    const t = tabOf(r, me, isGlobal);
    if (t) out[t].push(r);
  }
  // Oldest first where someone is waiting, newest first when done.
  const at = (r: FeedRow) => Date.parse((r.status === 'approved' ? r.approved_at : r.submitted_at) ?? '') || 0;
  out.review.sort((a, b) => at(a) - at(b));
  out.waiting.sort((a, b) => at(a) - at(b));
  out.done.sort((a, b) => at(b) - at(a));
  return out;
}

/** "waiting for 3h" (AD-2). */
export function waitingFor(submittedAt: string | null, now: number): string {
  const t = Date.parse(submittedAt ?? '');
  if (!Number.isFinite(t)) return '';
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function badgeOf(row: FeedRow, me: string): 'Assigned to you' | 'Unclaimed' | 'Assigned' {
  if (row.assigned_admin_id === null) return 'Unclaimed';
  return row.assigned_admin_id === me ? 'Assigned to you' : 'Assigned';
}

/** AD-10. The personal link the admin shares with sellers. */
export function referralLink(siteUrl: string, code: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/list?ref=${code}`;
}
export function whatsappShareUrl(link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`List your item on OBN NATION: ${link}`)}`;
}

export function naira(v: number | string): string {
  const n = Number(v);
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}
