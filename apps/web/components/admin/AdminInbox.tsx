'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Inbox, RefreshCw, Search, Share2, X } from 'lucide-react';
import { badgeOf, naira, splitTabs, TABS, waitingFor, whatsappShareUrl, type FeedRow, type TabId } from '@/lib/admin/inbox';
import { CATEGORIES, REGIONS } from '@/lib/listing/schema';
import { postJson } from '@/lib/auth/client';
import { ListingDetail } from './ListingDetail';
import { RejectModal } from './RejectModal';
import { ageLabel, Badge, categoryLabel, ConfirmDialog, Notice, PageTitle, regionLabelOf, StatCard, Thumb, workingLabel, type Tone } from './ui';

export interface Me { id: string; role: 'regional_admin' | 'global_admin'; region: string | null; name: string | null }

type Sort = 'oldest' | 'newest' | 'price_low' | 'price_high';
type Who = 'all' | 'unclaimed' | 'mine';
const HOUR = 3_600_000;
const REFRESH_MS = 60_000;

/** Age in the queue sets the colour: under 12h calm, 12 to 24h amber, over 24h red (AD-2). */
function ageTone(submittedAt: string | null, now: number): Tone {
  const t = Date.parse(submittedAt ?? '');
  if (!Number.isFinite(t)) return 'mute';
  const h = (now - t) / HOUR;
  return h >= 24 ? 'red' : h >= 12 ? 'amber' : 'green';
}

function ago(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

export function AdminInbox({ me, rows, thumbs, link }: { me: Me; rows: FeedRow[]; thumbs: Record<string, string>; link: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('review');
  const [openId, setOpenId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rejecting, setRejecting] = useState<FeedRow | null>(null);
  const [approving, setApproving] = useState<FeedRow | null>(null);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set()); // rejections saved but WhatsApp failed (AD-6)
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<Sort>('oldest');
  const [who, setWho] = useState<Who>('all');
  const search = useRef<HTMLInputElement>(null);
  const isGlobal = me.role === 'global_admin';
  const tabs = useMemo(() => splitTabs(rows, me.id, isGlobal), [rows, me.id, isGlobal]);

  const refresh = useCallback(() => { const t = Date.now(); setNow(t); setUpdatedAt(t); router.refresh(); }, [router]);
  useEffect(() => {
    // AD-9: refresh when the tab comes back into view, and every 60 seconds while it is open.
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const every = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, REFRESH_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.clearInterval(every); window.clearInterval(tick); };
  }, [refresh]);

  const stats = useMemo(() => {
    const pending = tabs.review;
    const oldest = pending[0]?.submitted_at ?? null;
    const regions = isGlobal ? REGIONS.map((r) => r.value as string) : me.region ? [me.region] : [];
    return {
      pending: pending.length,
      unclaimed: pending.filter((r) => r.assigned_admin_id === null).length,
      mine: pending.filter((r) => r.assigned_admin_id === me.id).length,
      overdue: pending.filter((r) => now - (Date.parse(r.submitted_at ?? '') || now) >= 24 * HOUR).length,
      waiting: tabs.waiting.length,
      approved: tabs.done.length,
      oldest,
      perRegion: regions.map((v) => ({ v, n: pending.filter((r) => r.region === v).length })),
    };
  }, [tabs, now, isGlobal, me.id, me.region]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = tabs[tab].filter((r) =>
      (!region || r.region === region) && (!category || r.category === category) &&
      (who === 'all' || (who === 'unclaimed' ? r.assigned_admin_id === null : r.assigned_admin_id === me.id)) &&
      (!needle || [r.title, r.brand, r.model, r.seller_name].some((v) => (v ?? '').toLowerCase().includes(needle))));
    const at = (r: FeedRow) => Date.parse((r.status === 'approved' ? r.approved_at : r.submitted_at) ?? '') || 0;
    const price = (r: FeedRow) => Number(r.price_ngn) || 0;
    out = [...out].sort(sort === 'oldest' ? (a, b) => at(a) - at(b) : sort === 'newest' ? (a, b) => at(b) - at(a) : sort === 'price_low' ? (a, b) => price(a) - price(b) : (a, b) => price(b) - price(a));
    return out;
  }, [tabs, tab, q, region, category, who, sort, me.id]);

  const open = openId ? rows.find((r) => r.id === openId) ?? null : null;
  const openIdx = openId ? list.findIndex((r) => r.id === openId) : -1;
  const go = (i: number) => { const n = list[i]; if (n) { setOpenId(n.id); setSelId(n.id); } };
  const selIdx = Math.max(0, list.findIndex((r) => r.id === selId));
  const selected = list[selIdx] ?? null;
  const filtered = Boolean(q || region || category || who !== 'all');

  async function act(row: FeedRow, action: 'claim' | 'approve') {
    if (busy) return;
    setBusy(row.id);
    setMessage(null);
    setNotice(null);
    const r = await postJson('/api/listings/decide', { listing_id: row.id, action });
    setBusy(null);
    setApproving(null);
    if (!r.ok) setMessage(r.error.message);
    else setNotice(action === 'claim' ? `You are now in charge of “${row.title}”.` : `Approved “${row.title}”. It is live in the pool.`);
    if (action === 'approve') setOpenId(null);
    refresh();
  }

  async function reject(row: FeedRow, reason: string) {
    if (busy) return;
    setBusy(row.id);
    setMessage(null);
    const r = await postJson<{ notification: { status: 'sent' | 'failed' } }>('/api/listings/reject', { listing_id: row.id, reason });
    setBusy(null);
    setRejecting(null);
    setOpenId(null);
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

  // Keyboard: j/k move, Enter opens, c claims, a approves (asks first), r rejects, / searches. Never while typing or in a dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (rejecting || approving || document.querySelector('[role="dialog"]:not([data-drawer])')) return;
      const move = (d: number) => { const n = list[Math.min(list.length - 1, Math.max(0, selIdx + d))]; if (n) { setSelId(n.id); if (openId) setOpenId(n.id); } };
      const target = open ?? selected;
      switch (e.key) {
        case 'j': e.preventDefault(); move(1); break;
        case 'k': e.preventDefault(); move(-1); break;
        case 'Enter': if (selected && !openId && t?.tagName !== 'BUTTON' && t?.tagName !== 'A') { e.preventDefault(); setOpenId(selected.id); } break;
        case 'c': if (target && target.status === 'pending_review' && target.assigned_admin_id === null) void act(target, 'claim'); break;
        case 'a': if (target && target.status === 'pending_review') setApproving(target); break;
        case 'r': if (target && target.status === 'pending_review') setRejecting(target); break;
        case '/': e.preventDefault(); search.current?.focus(); break;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const regionsLabel = isGlobal ? 'all regions' : regionLabelOf(me.region) || 'your region';

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Review queue" sub={`${stats.pending} ${stats.pending === 1 ? 'item is' : 'items are'} waiting in ${regionsLabel}.`}>
        <span className="ops-mute text-xs" aria-live="off">Updated {ago(now - updatedAt)}</span>
        <button type="button" onClick={refresh} className="ops-btn" aria-label="Refresh the list"><RefreshCw size={18} aria-hidden="true" /> Refresh</button>
      </PageTitle>

      <section aria-label="Queue at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Needs review" value={stats.pending} tone="red" hint={stats.oldest ? `Oldest waiting ${waitingFor(stats.oldest, now)}` : 'Nothing waiting'} />
        <StatCard label="Unclaimed" value={stats.unclaimed} tone="blue" hint={`${stats.mine} assigned to you`} />
        <StatCard label="Over 24 hours" value={stats.overdue} tone="amber" hint={stats.overdue ? 'Please look at these first' : 'No one is waiting long'} />
        <StatCard label="Approved" value={stats.approved} tone="green" hint={`${stats.waiting} waiting for sellers`} />
      </section>

      <div className="grid gap-3 lg:grid-cols-[1fr_minmax(0,380px)]">
        <section className="ops-card flex flex-wrap items-center gap-2 p-4" aria-label="Pending by region">
          <p className="ops-mute mr-2 text-xs font-semibold uppercase tracking-[0.14em]">Pending by region</p>
          {stats.perRegion.length === 0 && <span className="ops-mute text-sm">No region set</span>}
          {stats.perRegion.map(({ v, n }) => (
            <button key={v} type="button" onClick={() => setRegion(isGlobal ? (region === v ? '' : v) : '')} aria-pressed={region === v}
              className={`ops-badge ${n ? 'ops-b-red' : 'ops-b-mute'} !min-h-9 !px-4 text-sm ${region === v ? 'ring-2 ring-white' : ''}`}>{regionLabelOf(v)} · {n}</button>
          ))}
        </section>
        {link && (
          <section className="ops-card flex flex-col gap-2 p-4" aria-label="Your referral link">
            <p className="ops-mute text-xs font-semibold uppercase tracking-[0.14em]">Your link for sellers</p>
            <p className="break-all text-sm">{link}</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="ops-btn" onClick={copy}>{copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}{copied ? 'Copied' : 'Copy'}</button>
              <a className="ops-btn" href={whatsappShareUrl(link)} target="_blank" rel="noopener noreferrer"><Share2 size={18} aria-hidden="true" />WhatsApp</a>
            </div>
          </section>
        )}
      </div>

      {notice && <Notice kind="ok">{notice}</Notice>}
      {message && <Notice kind="error">{message}</Notice>}

      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="Listings" className="grid grid-cols-3 gap-1 rounded-2xl border border-[#232C3D] bg-[#0E1219] p-1 sm:max-w-xl">
          {TABS.map((t) => (
            <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`min-h-11 rounded-xl px-2 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-[#1F293C] text-white shadow' : 'ops-mute hover:text-white'}`}>
              {t.label} <span className={tab === t.id ? 'text-[#64B5F6]' : ''}>({tabs[t.id].length})</span>
            </button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="relative">
            <label htmlFor="q" className="sr-only">Search title, brand, model or seller</label>
            <Search size={18} className="ops-mute pointer-events-none absolute left-3 top-3" aria-hidden="true" />
            <input id="q" ref={search} className="ops-input !pl-10" type="search" placeholder="Search  ( / )" value={q} maxLength={60} onChange={(e) => setQ(e.target.value)} />
          </div>
          {isGlobal ? (
            <>
              <label className="sr-only" htmlFor="f-reg">Region</label>
              <select id="f-reg" className="ops-input" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">All regions</option>
                {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </>
          ) : <span className="hidden md:block" />}
          <label className="sr-only" htmlFor="f-cat">Category</label>
          <select id="f-cat" className="ops-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-who">Assigned to</label>
          <select id="f-who" className="ops-input" value={who} onChange={(e) => setWho(e.target.value as Who)}>
            <option value="all">Everyone’s</option><option value="unclaimed">Unclaimed</option><option value="mine">Mine</option>
          </select>
          <label className="sr-only" htmlFor="f-sort">Sort</label>
          <select id="f-sort" className="ops-input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="oldest">Oldest first</option><option value="newest">Newest first</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option>
          </select>
        </div>
        {filtered && (
          <p className="ops-mute flex items-center gap-2 text-sm">Showing {list.length} of {tabs[tab].length}.
            <button type="button" className="ops-btn !min-h-9 !px-3 !text-sm" onClick={() => { setQ(''); setRegion(''); setCategory(''); setWho('all'); }}><X size={14} aria-hidden="true" />Clear filters</button>
          </p>
        )}
      </div>

      {list.length === 0 && (
        <div className="ops-card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1F293C]" aria-hidden="true"><Inbox size={26} /></span>
          <p className="font-display text-xl font-extrabold">{filtered ? 'Nothing matches those filters.' : tab === 'review' ? 'Queue clear. Nice work.' : 'Nothing here right now.'}</p>
          <p className="ops-mute max-w-sm text-sm">{filtered ? 'Try clearing a filter.' : tab === 'review' ? 'Nobody is waiting on you. Share your link and more listings will come.' : 'When something moves here, you will see it.'}</p>
          <div className="flex h-1 w-24 overflow-hidden rounded-full" aria-hidden="true"><i className="flex-1 bg-brand-red" /><i className="flex-1 bg-brand-green" /><i className="flex-1 bg-brand-blue" /></div>
        </div>
      )}

      <ul className="flex flex-col gap-2" aria-label="Listings">
        {list.map((r) => {
          const badge = badgeOf(r, me.id);
          const thumb = thumbs[r.photo_urls[0]];
          const pending = r.status === 'pending_review';
          const isSel = selected?.id === r.id;
          return (
            <li key={r.id} className={`ops-card overflow-hidden ${isSel ? 'ops-sel' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center">
                <button type="button" className="ops-row min-w-0 flex-1 !rounded-none" onClick={() => { setSelId(r.id); setOpenId(r.id); }} aria-label={`Open ${r.title}`}>
                  <Thumb src={thumb} size="h-24 w-24 md:h-28 md:w-28" />
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display truncate text-lg font-extrabold leading-tight tracking-tight">{r.title}</span>
                    </span>
                    <span className="font-display text-lg font-bold text-[#66BB6A]">{naira(r.price_ngn)}</span>
                    <span className="flex flex-wrap gap-1.5">
                      <span className="ops-chip">{categoryLabel(r.category)}</span>
                      {isGlobal && <span className="ops-chip">{regionLabelOf(r.region)}</span>}
                      <span className="ops-chip">{ageLabel(r.condition_age)}</span>
                      <span className="ops-chip">{workingLabel(r.condition_work)}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      {pending && <Badge tone={ageTone(r.submitted_at, now)}>Waiting {waitingFor(r.submitted_at, now)}</Badge>}
                      <Badge tone={badge === 'Unclaimed' ? 'amber' : badge === 'Assigned to you' ? 'green' : 'mute'}>{badge}</Badge>
                      <span className="ops-mute">{r.seller_name}{r.contact_visible ? ` · ${r.seller_phone}` : ''}</span>
                    </span>
                  </span>
                </button>
                {pending && (
                  <div className="grid grid-cols-3 gap-2 border-t border-[#232C3D] p-3 md:w-[340px] md:border-l md:border-t-0">
                    {r.assigned_admin_id === null ? (
                      <button type="button" className="ops-btn" disabled={busy === r.id} onClick={() => act(r, 'claim')}>Claim</button>
                    ) : <span />}
                    <button type="button" className="ops-btn ops-btn-stop" disabled={busy === r.id} onClick={() => setRejecting(r)}>Reject</button>
                    <button type="button" className="ops-btn ops-btn-go" disabled={busy === r.id} onClick={() => setApproving(r)}>Approve</button>
                  </div>
                )}
                {r.status === 'rejected' && (
                  <div className="flex flex-col gap-2 border-t border-[#232C3D] p-3 md:w-[260px] md:border-l md:border-t-0">
                    {failedIds.has(r.id) && <p className="text-sm text-[#FF8A80]">Message not sent</p>}
                    <button type="button" className="ops-btn" disabled={busy === r.id} onClick={() => resend(r)}>Send new link</button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="ops-mute hidden flex-wrap items-center gap-x-4 gap-y-1 text-xs md:flex" aria-label="Keyboard shortcuts">
        <span><span className="ops-kbd">J</span> <span className="ops-kbd">K</span> move</span>
        <span><span className="ops-kbd">Enter</span> open</span>
        <span><span className="ops-kbd">C</span> claim</span>
        <span><span className="ops-kbd">A</span> approve</span>
        <span><span className="ops-kbd">R</span> reject</span>
        <span><span className="ops-kbd">/</span> search</span>
        <span>Refreshes every minute</span>
      </p>

      {open && (
        <ListingDetail
          row={open}
          me={me.id}
          busy={busy === open.id}
          now={now}
          onClose={() => setOpenId(null)}
          onClaim={() => act(open, 'claim')}
          onApprove={() => setApproving(open)}
          onReject={() => setRejecting(open)}
          onPrev={openIdx > 0 ? () => go(openIdx - 1) : undefined}
          onNext={openIdx >= 0 && openIdx < list.length - 1 ? () => go(openIdx + 1) : undefined}
        />
      )}
      {approving && (
        <ConfirmDialog title="Approve this listing?" confirmLabel="Approve and go live" busy={busy === approving.id}
          body={<><p><b>{approving.title}</b> · {naira(approving.price_ngn)}</p><p className="ops-mute mt-1">It goes live in the pool for buyers.</p></>}
          onCancel={() => setApproving(null)} onConfirm={() => act(approving, 'approve')} />
      )}
      {rejecting && (
        <RejectModal title={rejecting.title} busy={busy === rejecting.id} onCancel={() => setRejecting(null)} onSubmit={(reason) => reject(rejecting, reason)} />
      )}
    </div>
  );
}
