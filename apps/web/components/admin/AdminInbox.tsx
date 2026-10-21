'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Copy, RefreshCw, Search, Share2, SkipForward, X } from 'lucide-react';
import { badgeOf, naira, splitTabs, TABS, waitingFor, whatsappShareUrl, type FeedRow, type TabId } from '@/lib/admin/inbox';
import { CATEGORIES, REGIONS } from '@/lib/listing/schema';
import { postJson } from '@/lib/auth/client';
import { ListingDetail } from './ListingDetail';
import { RejectModal } from './RejectModal';
import { ageLabel, Badge, categoryLabel, ConfirmDialog, Notice, regionLabelOf, Ribbon, workingLabel, type Tone } from './ui';

export interface Me { id: string; role: 'regional_admin' | 'global_admin'; region: string | null; name: string | null }

type Sort = 'oldest' | 'newest' | 'price_low' | 'price_high';
type Who = 'all' | 'unclaimed' | 'mine';
type View = 'board' | 'list' | 'review';
const BOARD_LIVE_MAX = 12;
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
  const [view, setView] = useState<View | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const touchX = useRef<number | null>(null);
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

  // One filter and one sort for every view. The board, the list and Review mode all read from here.
  const sorted = useCallback((rowsIn: FeedRow[]) => {
    const needle = q.trim().toLowerCase();
    const out = rowsIn.filter((r) =>
      (!region || r.region === region) && (!category || r.category === category) &&
      (who === 'all' || (who === 'unclaimed' ? r.assigned_admin_id === null : r.assigned_admin_id === me.id)) &&
      (!needle || [r.title, r.brand, r.model, r.seller_name].some((v) => (v ?? '').toLowerCase().includes(needle))));
    const at = (r: FeedRow) => Date.parse((r.status === 'approved' ? r.approved_at : r.submitted_at) ?? '') || 0;
    const price = (r: FeedRow) => Number(r.price_ngn) || 0;
    return out.sort(sort === 'oldest' ? (a, b) => at(a) - at(b) : sort === 'newest' ? (a, b) => at(b) - at(a) : sort === 'price_low' ? (a, b) => price(a) - price(b) : (a, b) => price(b) - price(a));
  }, [q, region, category, who, sort, me.id]);

  const cols = useMemo(() => {
    const unclaimed = sorted(tabs.review.filter((r) => r.assigned_admin_id === null));
    const claimed = sorted(tabs.review.filter((r) => r.assigned_admin_id !== null));
    const waiting = sorted(tabs.waiting);
    const live = sorted(tabs.done);
    return { unclaimed, claimed, waiting, live, liveShown: live.slice(0, BOARD_LIVE_MAX) };
  }, [sorted, tabs]);

  const list = useMemo(() => {
    if (view === 'board') return [...cols.unclaimed, ...cols.claimed, ...cols.waiting, ...cols.liveShown];
    if (view === 'review') return sorted(tabs.review);
    return sorted(tabs[tab]);
  }, [view, cols, sorted, tabs, tab]);

  useEffect(() => { if (view === null) setView(window.innerWidth < 1024 ? 'review' : 'board'); }, [view]);

  const open = openId ? rows.find((r) => r.id === openId) ?? null : null;
  const openIdx = openId ? list.findIndex((r) => r.id === openId) : -1;
  const go = (i: number) => { const n = list[i]; if (n) { setOpenId(n.id); setSelId(n.id); } };
  const selIdx = Math.max(0, list.findIndex((r) => r.id === selId));
  const selected = list[selIdx] ?? null;
  const filtered = Boolean(q || region || category || who !== 'all');
  const step = (d: number) => { if (list.length === 0) return; const n = list[(selIdx + d + list.length) % list.length]; setSelId(n.id); if (openId) setOpenId(n.id); };

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

  const firstName = (me.name ?? '').trim().split(/\s+/)[0] || 'there';
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateText = new Date(now).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' });
  const approvedToday = tabs.done.filter((r) => r.approved_at && new Date(r.approved_at).toDateString() === new Date(now).toDateString()).length;
  const total = approvedToday + stats.waiting + stats.pending;
  const scopeText = isGlobal ? 'all regions' : regionLabelOf(me.region) || 'your region';

  // Plain render helpers, called as functions (not components) so React keeps the DOM between renders.
  function Meta({ r }: { r: FeedRow }) {
    return (
      <p className="ops-mute text-sm font-semibold">
        {categoryLabel(r.category)}{isGlobal ? ` · ${regionLabelOf(r.region)}` : ''} · {ageLabel(r.condition_age)} · {workingLabel(r.condition_work)}
      </p>
    );
  }

  function Photo({ r, ratio = 'aspect-[4/3]' }: { r: FeedRow; ratio?: string }) {
    const src = thumbs[r.photo_urls[0]];
    const pending = r.status === 'pending_review';
    return (
      <button type="button" className={`ops-photo ${ratio}`} onClick={() => { setSelId(r.id); setOpenId(r.id); }} aria-label={`Open ${r.title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-end p-3 text-sm font-bold text-[#5B5547]">No photo</span>}
        {pending && <Ribbon tone={ageTone(r.submitted_at, now)}>Waiting {waitingFor(r.submitted_at, now)}</Ribbon>}
        {r.status === 'rejected' && <Ribbon tone="blue">With seller</Ribbon>}
        {r.status === 'approved' && <Ribbon tone="green">Live</Ribbon>}
      </button>
    );
  }

  function Actions({ r, big = false }: { r: FeedRow; big?: boolean }) {
    const b = busy === r.id;
    const size = big ? 'ops-btn-lg' : '';
    if (r.status === 'pending_review') {
      return (
        <div className={`grid gap-2 ${r.assigned_admin_id === null ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {r.assigned_admin_id === null && <button type="button" className={`ops-btn ops-btn-blue ${size}`} disabled={b} onClick={() => act(r, 'claim')}>Claim</button>}
          <button type="button" className={`ops-btn ops-btn-stop ${size}`} disabled={b} onClick={() => setRejecting(r)}>Reject</button>
          <button type="button" className={`ops-btn ops-btn-go ${size}`} disabled={b} onClick={() => setApproving(r)}>Approve</button>
        </div>
      );
    }
    if (r.status === 'rejected') {
      return (
        <div className="flex flex-col gap-2">
          {failedIds.has(r.id) && <p className="text-sm font-bold text-brand-red">Message not sent</p>}
          <button type="button" className={`ops-btn ${size}`} disabled={b} onClick={() => resend(r)}>Send new link</button>
        </div>
      );
    }
    return null;
  }

  function BoardCard({ r }: { r: FeedRow }) {
    const badge = badgeOf(r, me.id);
    return (
      <li key={r.id} className={`ops-card ops-lift overflow-hidden ${selected?.id === r.id ? 'ops-sel' : ''}`}>
        {Photo({ r })}
        <div className="flex flex-col gap-2 p-4">
          <p className="ops-num text-[34px]">{naira(r.price_ngn)}</p>
          <p className="font-display truncate text-lg font-extrabold leading-tight tracking-tight">{r.title}</p>
          {Meta({ r })}
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={badge === 'Unclaimed' ? 'amber' : badge === 'Assigned to you' ? 'green' : 'mute'}>{badge}</Badge>
            <span className="ops-mute font-semibold">{r.seller_name}{r.contact_visible ? ` · ${r.seller_phone}` : ''}</span>
          </p>
          <div className="pt-1">{Actions({ r })}</div>
        </div>
      </li>
    );
  }

  const COLS = [
    { id: 'unclaimed', title: 'Unclaimed', color: '#D32F2F', rows: cols.unclaimed, note: 'Nobody has this yet' },
    { id: 'claimed', title: 'Claimed', color: '#1565C0', rows: cols.claimed, note: 'Mine and my team’s' },
    { id: 'waiting', title: 'Waiting for seller', color: '#F2B233', rows: cols.waiting, note: 'Rejected, fix on the way' },
    { id: 'live', title: 'Live', color: '#2E7D32', rows: cols.liveShown, note: cols.live.length > BOARD_LIVE_MAX ? `Latest ${BOARD_LIVE_MAX} of ${cols.live.length}` : 'In the pool' },
  ];

  const empty = (
    <div className="flex flex-col items-start gap-3 py-10">
      <div className="flex h-2 w-28 overflow-hidden rounded-full" aria-hidden="true"><i className="flex-1 bg-brand-red" /><i className="flex-1 bg-brand-green" /><i className="flex-1 bg-brand-blue" /></div>
      <p className="font-display text-3xl font-extrabold tracking-tight">{filtered ? 'Nothing matches those filters.' : 'Queue clear.'}</p>
      <p className="ops-mute max-w-md">{filtered ? 'Try clearing a filter.' : 'Nobody is waiting on you. Share your link and more listings will come.'}</p>
    </div>
  );

  const item = view === 'review' ? selected : null;
  const onTouchEnd = (x: number) => {
    const s = touchX.current; touchX.current = null;
    if (s === null) return;
    const dx = x - s;
    if (dx < -70) step(1); else if (dx > 70) step(-1);
  };

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      <header className="ops-rise flex flex-col gap-6">
        <div>
          <p className="ops-eyebrow" suppressHydrationWarning>{dateText}</p>
          <h1 className="font-display mt-2 text-xl font-extrabold tracking-tight sm:text-2xl" suppressHydrationWarning>{greeting}, {firstName}.</h1>
          <p className="font-display mt-3 max-w-4xl text-[30px] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            {stats.pending > 0 ? (
              <><span className="text-brand-red">{stats.pending}</span> {stats.pending === 1 ? 'listing is' : 'listings are'} waiting. The oldest has waited {waitingFor(stats.oldest, now)}.</>
            ) : <>Nothing is waiting. The desk is clear.</>}
          </p>
        </div>

        <div aria-label="Today at the desk">
          <div className="ops-bar" role="img" aria-label={`${approvedToday} approved today, ${stats.waiting} waiting for sellers, ${stats.pending} to review`}>
            {total === 0 ? null : (
              <>
                <i className="bg-brand-green" style={{ flexGrow: approvedToday }} />
                <i className="bg-brand-blue" style={{ flexGrow: stats.waiting }} />
                <i className="bg-brand-red" style={{ flexGrow: stats.pending }} />
              </>
            )}
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-[15px]">
            <div className="flex items-baseline gap-2"><dd className="ops-num text-2xl sm:text-3xl text-brand-green">{approvedToday}</dd><dt className="font-bold">approved today</dt></div>
            <div className="flex items-baseline gap-2"><dd className="ops-num text-2xl sm:text-3xl text-brand-blue">{stats.waiting}</dd><dt className="font-bold">with sellers</dt></div>
            <div className="flex items-baseline gap-2"><dd className="ops-num text-2xl sm:text-3xl text-brand-red">{stats.pending}</dd><dt className="font-bold">to review{stats.overdue ? ` · ${stats.overdue} over 24 hours` : ''}</dt></div>
            <div className="flex items-baseline gap-2"><dd className="ops-num text-2xl sm:text-3xl">{stats.mine}</dd><dt className="font-bold">on my plate</dt></div>
          </dl>
        </div>

      </header>

      {notice && <Notice kind="ok">{notice}</Notice>}
      {message && <Notice kind="error">{message}</Notice>}

      <section className="flex flex-col gap-4" aria-label="Review">
        <div className="flex flex-wrap items-center gap-3">
          <div className="ops-seg" role="group" aria-label="View">
            {(['board', 'list', 'review'] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v === 'board' ? 'Board' : v === 'list' ? 'List' : 'Review mode'}</button>
            ))}
          </div>
          {isGlobal && (
            <div className="ops-seg" role="group" aria-label="Region">
              <button type="button" aria-pressed={region === ''} onClick={() => setRegion('')}>All</button>
              {stats.perRegion.map(({ v, n }) => (
                <button key={v} type="button" aria-pressed={region === v} onClick={() => setRegion(region === v ? '' : v)}>{regionLabelOf(v)} <span className="ops-segn">{n}</span></button>
              ))}
            </div>
          )}
          <span className="ml-auto flex items-center gap-3">
            <span className="ops-mute hidden text-sm sm:inline" aria-live="off">Updated {ago(now - updatedAt)}</span>
            <button type="button" onClick={refresh} className="ops-btn !min-h-10" aria-label="Refresh the list"><RefreshCw size={16} aria-hidden="true" />Refresh</button>
          </span>
        </div>

        <button type="button" className="ops-btn self-start sm:!hidden" aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>{showFilters ? 'Hide filters' : 'Search and filters'}</button>
        <div className={`${showFilters ? 'grid' : 'hidden'} gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]`}>
          <div className="relative sm:col-span-2 lg:col-span-1">
            <label htmlFor="q" className="sr-only">Search title, brand, model or seller</label>
            <Search size={18} className="pointer-events-none absolute left-4 top-3.5" aria-hidden="true" />
            <input id="q" ref={search} className="ops-input !pl-11" type="search" placeholder="Search  ( / )" value={q} maxLength={60} onChange={(e) => setQ(e.target.value)} />
          </div>
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
          <p className="flex items-center gap-3 text-sm font-semibold">Showing {list.length}{view === 'board' ? '' : ` of ${view === 'review' ? tabs.review.length : tabs[tab].length}`} in {scopeText}.
            <button type="button" className="ops-btn !min-h-9 !px-3 !text-sm" onClick={() => { setQ(''); setRegion(''); setCategory(''); setWho('all'); }}><X size={14} aria-hidden="true" />Clear filters</button>
          </p>
        )}

        {view === null && <div className="min-h-[40vh]" aria-hidden="true" />}

        {view === 'board' && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" aria-label="Pipeline board">
            {COLS.map((c) => (
              <section key={c.id} className="ops-col flex min-w-0 flex-col" style={{ ['--c' as string]: c.color }} aria-label={c.title}>
                <header className="flex items-end justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-extrabold leading-tight tracking-tight">{c.title}</h2>
                    <p className="ops-mute truncate text-sm">{c.note}</p>
                  </div>
                  <span className="ops-num text-5xl">{c.id === 'live' ? cols.live.length : c.rows.length}</span>
                </header>
                <ul className="ops-colbody flex flex-col gap-4">
                  {c.rows.map((r) => BoardCard({ r }))}
                  {c.rows.length === 0 && <li className="ops-mute rounded-2xl border-2 border-dashed border-[#D6CDB9] px-4 py-10 text-center text-sm font-semibold">Nothing here</li>}
                </ul>
              </section>
            ))}
          </div>
        )}

        {view === 'list' && (
          <div className="flex flex-col gap-4">
            <div className="ops-seg" role="tablist" aria-label="Listings">
              {TABS.map((t) => (
                <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label} <span className="ops-segn">{tabs[t.id].length}</span></button>
              ))}
            </div>
            {list.length === 0 && empty}
            <ul className="flex flex-col gap-3" aria-label="Listings">
              {list.map((r) => {
                const badge = badgeOf(r, me.id);
                const src = thumbs[r.photo_urls[0]];
                return (
                  <li key={r.id} className={`ops-card ops-lift overflow-hidden ${selected?.id === r.id ? 'ops-sel' : ''}`}>
                    <div className="flex flex-col md:flex-row md:items-center">
                      <button type="button" className="flex min-w-0 flex-1 gap-4 p-3 text-left" onClick={() => { setSelId(r.id); setOpenId(r.id); }} aria-label={`Open ${r.title}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {src ? <img src={src} alt="" className="h-28 w-28 flex-none rounded-xl object-cover" /> : <span className="h-28 w-28 flex-none rounded-xl bg-[#EBE5D6]" aria-hidden="true" />}
                        <span className="flex min-w-0 flex-col justify-center gap-1.5">
                          <span className="ops-num text-4xl">{naira(r.price_ngn)}</span>
                          <span className="font-display truncate text-lg font-extrabold leading-tight tracking-tight">{r.title}</span>
                          {Meta({ r })}
                          <span className="flex flex-wrap items-center gap-2 text-sm">
                            {r.status === 'pending_review' && <Badge tone={ageTone(r.submitted_at, now)}>Waiting {waitingFor(r.submitted_at, now)}</Badge>}
                            <Badge tone={badge === 'Unclaimed' ? 'amber' : badge === 'Assigned to you' ? 'green' : 'mute'}>{badge}</Badge>
                            <span className="ops-mute font-semibold">{r.seller_name}{r.contact_visible ? ` · ${r.seller_phone}` : ''}</span>
                          </span>
                        </span>
                      </button>
                      {r.status !== 'approved' && <div className="border-t-2 border-[#D6CDB9] p-3 md:w-[320px] md:border-l-2 md:border-t-0">{Actions({ r })}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {view === 'review' && (
          <div className="flex flex-col gap-4" aria-label="Review mode">
            {!item ? empty : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
                onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }} onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <p className="font-display text-xl font-extrabold"><span className="ops-num text-4xl">{selIdx + 1}</span> of {list.length}</p>
                    <div className="ops-bar !h-2 flex-1" aria-hidden="true"><i className="bg-[#16140F]" style={{ flexGrow: selIdx + 1 }} /><i style={{ flexGrow: Math.max(0, list.length - selIdx - 1) }} /></div>
                  </div>
                  <div className="overflow-hidden rounded-2xl border-2 border-[#16140F]">{Photo({ r: item, ratio: 'aspect-[4/5] max-h-[52vh] lg:max-h-[620px] sm:aspect-[4/3]' })}</div>
                </div>
                <div className="flex flex-col gap-4">
                  <p className="ops-num text-[64px] sm:text-[84px]">{naira(item.price_ngn)}</p>
                  <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{item.title}</h2>
                  {Meta({ r: item })}
                  <p className="line-clamp-3 text-[15px] leading-relaxed">{item.description}</p>
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone={badgeOf(item, me.id) === 'Unclaimed' ? 'amber' : badgeOf(item, me.id) === 'Assigned to you' ? 'green' : 'mute'}>{badgeOf(item, me.id)}</Badge>
                    <span className="ops-mute font-semibold">{item.seller_name}{item.contact_visible ? ` · ${item.seller_phone}` : ''}</span>
                  </p>
                  <div className="fixed inset-x-0 z-20 flex flex-col gap-2 border-t-2 border-[#16140F] bg-[#F4F0E8] p-3 max-lg:bottom-[calc(60px+env(safe-area-inset-bottom))] lg:static lg:border-0 lg:bg-transparent lg:p-0">
                    {Actions({ r: item, big: true })}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className="ops-btn" onClick={() => step(1)} disabled={list.length < 2}><SkipForward size={18} aria-hidden="true" />Skip</button>
                      <button type="button" className="ops-btn" onClick={() => setOpenId(item.id)}>Full details <ArrowRight size={18} aria-hidden="true" /></button>
                    </div>
                  </div>
                  <div className="h-32 lg:hidden" aria-hidden="true" />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <p className="ops-mute hidden flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold lg:flex" aria-label="Keyboard shortcuts">
        <span><span className="ops-kbd">J</span> <span className="ops-kbd">K</span> move</span>
        <span><span className="ops-kbd">Enter</span> open</span>
        <span><span className="ops-kbd">C</span> claim</span>
        <span><span className="ops-kbd">A</span> approve</span>
        <span><span className="ops-kbd">R</span> reject</span>
        <span><span className="ops-kbd">/</span> search</span>
        <span>Refreshes every minute</span>
      </p>

      {link && (
          <section className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y-2 border-[#16140F] py-3" aria-label="Your referral link">
            <p className="ops-eyebrow">Your link for sellers</p>
            <p className="min-w-0 flex-1 truncate text-sm font-bold">{link}</p>
            <div className="flex gap-2">
              <button type="button" className="ops-btn !min-h-10" onClick={copy}>{copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}{copied ? 'Copied' : 'Copy'}</button>
              <a className="ops-btn ops-btn-go !min-h-10" href={whatsappShareUrl(link)} target="_blank" rel="noopener noreferrer"><Share2 size={18} aria-hidden="true" />WhatsApp</a>
            </div>
          </section>
      )}

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
