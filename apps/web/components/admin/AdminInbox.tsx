'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, RefreshCw, Share2 } from 'lucide-react';
import { badgeOf, naira, splitTabs, TABS, waitingFor, whatsappShareUrl, type FeedRow, type TabId } from '@/lib/admin/inbox';
import { AGES, CATEGORIES, REGIONS, WORKING } from '@/lib/listing/schema';
import { postJson } from '@/lib/auth/client';
import { ListingDetail } from './ListingDetail';
import { RejectModal } from './RejectModal';
import { primaryButton, secondaryButton } from '../listing/ui';

const label = (list: readonly { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;
const chip = 'rounded-full border border-border px-2 py-1 text-xs text-muted';

export interface Me { id: string; role: 'regional_admin' | 'global_admin'; region: string | null; name: string | null }

export function AdminInbox({ me, rows, thumbs, link }: { me: Me; rows: FeedRow[]; thumbs: Record<string, string>; link: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('review');
  const [open, setOpen] = useState<FeedRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rejecting, setRejecting] = useState<FeedRow | null>(null);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set()); // rejections saved but WhatsApp failed (AD-6)
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const isGlobal = me.role === 'global_admin';
  const tabs = useMemo(() => splitTabs(rows, me.id, isGlobal), [rows, me.id, isGlobal]);

  const refresh = useCallback(() => { setNow(Date.now()); router.refresh(); }, [router]);
  useEffect(() => {
    // AD-9: refresh when the tab comes back into view.
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  async function act(row: FeedRow, action: 'claim' | 'approve') {
    if (busy) return;
    if (action === 'approve' && !window.confirm('Approve this listing? It will go live for buyers.')) return;
    setBusy(row.id);
    setMessage(null);
    setNotice(null);
    const r = await postJson('/api/listings/decide', { listing_id: row.id, action });
    setBusy(null);
    if (!r.ok) setMessage(r.error.message);
    setOpen(null);
    refresh();
  }

  async function reject(row: FeedRow, reason: string) {
    if (busy) return;
    setBusy(row.id);
    setMessage(null);
    const r = await postJson<{ notification: { status: 'sent' | 'failed' } }>('/api/listings/reject', { listing_id: row.id, reason });
    setBusy(null);
    setRejecting(null);
    setOpen(null);
    if (!r.ok) setMessage(r.error.message);
    else markNotice(row.id, r.data.notification.status === 'sent', 'Rejected. The seller has been messaged.');
    refresh();
  }

  async function resend(row: FeedRow) {
    if (busy) return;
    setBusy(row.id);
    setMessage(null);
    const r = await postJson<{ notification: { status: 'sent' | 'failed' } }>('/api/listings/reissue', { listing_id: row.id });
    setBusy(null);
    if (!r.ok) setMessage(r.error.message);
    else markNotice(row.id, r.data.notification.status === 'sent', 'New link sent to the seller.');
    refresh();
  }

  function markNotice(id: string, sent: boolean, okText: string) {
    setFailedIds((s) => { const n = new Set(s); if (sent) n.delete(id); else n.add(id); return n; });
    setNotice(sent ? okText : null);
    if (!sent) setMessage('Rejected, but the WhatsApp message was not sent. Tap “Send new link” on the card.');
  }

  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setMessage('Copy did not work. Press and hold the link to copy it.'); }
  }

  const list = tabs[tab];
  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Review</h1>
        <button type="button" onClick={refresh} className="flex min-h-12 items-center gap-2 text-tint-blue" aria-label="Refresh the list">
          <RefreshCw size={18} aria-hidden="true" /> Refresh
        </button>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {tabs.review.length} {tabs.review.length === 1 ? 'item is' : 'items are'} waiting{isGlobal ? '' : me.region ? ` in ${label(REGIONS, me.region)}` : ''}.
      </p>

      {link && (
        <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3" aria-label="Your referral link">
          <p className="text-sm text-muted">Your link for sellers</p>
          <p className="break-all text-base">{link}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={secondaryButton} onClick={copy}><Copy size={18} className="mr-2 inline" aria-hidden="true" />{copied ? 'Copied' : 'Copy'}</button>
            <a className={`${secondaryButton} text-center`} href={whatsappShareUrl(link)} target="_blank" rel="noopener noreferrer"><Share2 size={18} className="mr-2 inline" aria-hidden="true" />WhatsApp</a>
          </div>
        </section>
      )}

      {notice && <p role="status" className="rounded-lg border border-border bg-surface p-3 text-base text-tint-green">{notice}</p>}
      {message && <p role="alert" className="rounded-lg border border-tint-red bg-surface p-3 text-base text-tint-red">{message}</p>}

      <div role="tablist" aria-label="Listings" className="grid grid-cols-3 gap-1">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`min-h-12 rounded-lg px-1 text-sm ${tab === t.id ? 'bg-surface text-white ring-1 ring-border' : 'text-muted'}`}>
            {t.label} ({tabs[t.id].length})
          </button>
        ))}
      </div>

      {list.length === 0 && <p className="py-8 text-center text-muted">Nothing here right now.</p>}
      <ul className="flex flex-col gap-3">
        {list.map((r) => {
          const badge = badgeOf(r, me.id);
          const thumb = thumbs[r.photo_urls[0]];
          return (
            <li key={r.id} className="rounded-lg border border-border bg-surface">
              <button type="button" className="flex w-full gap-3 p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" onClick={() => setOpen(r)}>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="h-20 w-20 flex-none rounded object-cover" />
                ) : <div className="h-20 w-20 flex-none rounded bg-border" aria-hidden="true" />}
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-base font-semibold">{r.title}</span>
                  <span className="text-base">{naira(r.price_ngn)}</span>
                  <span className="flex flex-wrap gap-1">
                    <span className={chip}>{label(CATEGORIES, r.category)}</span>
                    <span className={chip}>{label(REGIONS, r.region)}</span>
                    <span className={chip}>{label(AGES, r.condition_age)}</span>
                    <span className={chip}>{label(WORKING, r.condition_work)}</span>
                  </span>
                  <span className="text-sm text-muted">
                    {r.status === 'pending_review' ? `Waiting for ${waitingFor(r.submitted_at, now)} · ` : ''}{badge} · {r.seller_name}{r.contact_visible ? ` · ${r.seller_phone}` : ''}
                  </span>
                </span>
              </button>
              {r.status === 'pending_review' && (
                <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
                  {r.assigned_admin_id === null ? (
                    <button type="button" className={secondaryButton} disabled={busy === r.id} onClick={() => act(r, 'claim')}>Claim</button>
                  ) : <span />}
                  <button type="button" className={primaryButton} disabled={busy === r.id} onClick={() => act(r, 'approve')}>Approve</button>
                  <button type="button" className={`${secondaryButton} col-span-2`} disabled={busy === r.id} onClick={() => setRejecting(r)}>Reject</button>
                </div>
              )}
              {r.status === 'rejected' && (
                <div className="flex flex-col gap-2 border-t border-border p-3">
                  {failedIds.has(r.id) && <p className="text-sm text-tint-red">Message not sent</p>}
                  <button type="button" className={secondaryButton} disabled={busy === r.id} onClick={() => resend(r)}>Send new link</button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {open && (
        <ListingDetail
          row={open}
          me={me.id}
          busy={busy === open.id}
          onClose={() => setOpen(null)}
          onClaim={() => act(open, 'claim')}
          onApprove={() => act(open, 'approve')}
          onReject={() => setRejecting(open)}
        />
      )}
      {rejecting && (
        <RejectModal title={rejecting.title} busy={busy === rejecting.id} onCancel={() => setRejecting(null)} onSubmit={(reason) => reject(rejecting, reason)} />
      )}
    </div>
  );
}
