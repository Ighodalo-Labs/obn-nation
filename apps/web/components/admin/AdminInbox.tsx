'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Copy, Inbox, RefreshCw, Search, Share2, X } from 'lucide-react';
import { badgeOf, naira, splitTabs, waitingFor, whatsappShareUrl, type FeedRow, type TabId } from '@/lib/admin/inbox';
import { CATEGORIES, REGIONS } from '@/lib/listing/schema';
import { postJson } from '@/lib/auth/client';
import { ListingDetail } from './ListingDetail';
import { RejectModal } from './RejectModal';
import { ageLabel, Badge, Banner, Card, categoryLabel, ConfirmDialog, EmptyState, Metrics, Page, regionLabelOf, Thumb, Toast, workingLabel, type Tone } from './ui';

export interface Me { id: string; role: 'regional_admin' | 'global_admin'; region: string | null; name: string | null }

type Sort = 'oldest' | 'newest' | 'price_low' | 'price_high';
type Who = 'all' | 'unclaimed' | 'mine';
type View = 'list' | 'board' | 'review';
type LTab = 'all' | TabId;
const BOARD_LIVE_MAX = 12;
const HOUR = 3_600_000;
const REFRESH_MS = 60_000;
const TAB_LIST: { id: LTab; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'review', label: 'Needs review' }, { id: 'waiting', label: 'Waiting for seller' }, { id: 'done', label: 'Approved' },
];

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

/** A filter pill with a native select laid over it, so it works with a keyboard and on a phone. */
function FilterSelect({ label, value, options, onChange, strong = false }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; strong?: boolean;
}) {
  const cur = options.find((o) => o.value === value);
  const on = strong || value !== '';
  return (
    <label className="ops-filterbtn" data-on={on}>
      <span>{strong ? `${label}: ${cur?.label ?? ''}` : value ? `${label}: ${cur?.label ?? ''}` : label}</span>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="m2 3.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function AdminInbox({ me, rows, thumbs, link }: { me: Me; rows: FeedRow[]; thumbs: Record<string, string>; link: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<LTab>('review');
  const [openId, setOpenId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rejecting, setRejecting] = useState<FeedRow | null>(null);
  const [approving, setApproving] = useState<FeedRow[] | null>(null);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set()); // rejections saved but WhatsApp failed (AD-6)
  const [notice, setNotice] = useState<string | null>(null);
  const [testLink, setTestLink] = useState<{ title: string; url: string } | null>(null); // test mode only: WhatsApp is off, so the admin gets the seller's link here
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, []);
  const [updatedAt, setUpdatedAt] = useState(0);
  useEffect(() => { setUpdatedAt(Date.now()); }, []);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<Sort>('oldest');
  const [who, setWho] = useState<Who>('all');
  const [view, setView] = useState<View>('list');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const touchX = useRef<number | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const isGlobal = me.role === 'global_admin';
  const tabs = useMemo(() => splitTabs(rows, me.id, isGlobal), [rows, me.id, isGlobal]);

  // The top bar search filters this table. A link like /admin/dashboard?q=lamp pre-fills it.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('q');
    if (fromUrl) setQ(fromUrl.slice(0, 60));
    const onSearch = (e: Event) => setQ(String((e as CustomEvent).detail ?? '').slice(0, 60));
    window.addEventListener('ops:search', onSearch);
    return () => window.removeEventListener('ops:search', onSearch);
  }, []);

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

  // One filter and one sort for every view. The board, the table and Review mode all read from here.
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

  const tabRows = useCallback((t: LTab) => (t === 'all' ? [...tabs.review, ...tabs.waiting, ...tabs.done] : tabs[t]), [tabs]);
  const list = useMemo(() => {
    if (view === 'board') return [...cols.unclaimed, ...cols.claimed, ...cols.waiting, ...cols.liveShown];
    if (view === 'review') return sorted(tabs.review);
    return sorted(tabRows(tab));
  }, [view, cols, sorted, tabs, tab, tabRows]);

  // Selection only keeps rows that are still on screen.
  const checkedRows = useMemo(() => list.filter((r) => checked.has(r.id)), [list, checked]);
  const toggleOne = (id: string) => setChecked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allChecked = list.length > 0 && checkedRows.length === list.length;
  const someChecked = checkedRows.length > 0 && !allChecked;
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(list.map((r) => r.id)));

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

  /** Several at once: one request each, in order. Failures are counted and shown. */
  async function bulk(action: 'claim' | 'approve', targets: FeedRow[]) {
    if (busy || targets.length === 0) return;
    setBusy('bulk');
    setMessage(null);
    setNotice(null);
    let done = 0;
    let firstError = '';
    for (const row of targets) {
      const r = await postJson('/api/listings/decide', { listing_id: row.id, action });
      if (r.ok) done += 1; else if (!firstError) firstError = r.error.message;
    }
    setBusy(null);
    setApproving(null);
    setChecked(new Set());
    if (done > 0) setNotice(action === 'claim' ? `You are now in charge of ${done} ${done === 1 ? 'listing' : 'listings'}.` : `Approved ${done} ${done === 1 ? 'listing' : 'listings'}. They are live in the pool.`);
    if (firstError) setMessage(`${targets.length - done} of ${targets.length} did not go through. ${firstError}`);
    refresh();
  }

  async function reject(row: FeedRow, reason: string) {
    if (busy) return;
    setBusy(row.id);
    setMessage(null);
    const r = await postJson<{ notification: { status: 'sent' | 'failed'; stub_edit_link?: string } }>('/api/listings/reject', { listing_id: row.id, reason });
    setBusy(null);
    setRejecting(null);
    setOpenId(null);
    if (!r.ok) setMessage(r.error.message);
    else if (r.data.notification.stub_edit_link) {
      setTestLink({ title: row.title, url: r.data.notification.stub_edit_link });
      markNotice(row.id, true, 'Rejected. Test mode: messages are off, so nothing was sent. Use the test link.');
    } else markNotice(row.id, r.data.notification.status === 'sent', 'Rejected. The seller has been messaged.');
    refresh();
  }

  async function resend(row: FeedRow) {
    if (busy) return;
    setBusy(row.id);
    setMessage(null);
    const r = await postJson<{ notification: { status: 'sent' | 'failed'; stub_edit_link?: string } }>('/api/listings/reissue', { listing_id: row.id });
    setBusy(null);
    if (!r.ok) setMessage(r.error.message);
    else if (r.data.notification.stub_edit_link) {
      setTestLink({ title: row.title, url: r.data.notification.stub_edit_link });
      markNotice(row.id, true, 'New link made. Test mode: messages are off, so nothing was sent.');
    } else markNotice(row.id, r.data.notification.status === 'sent', 'New link sent to the seller.');
    refresh();
  }

  function markNotice(id: string, sent: boolean, okText: string) {
    setFailedIds((s) => { const n = new Set(s); if (sent) n.delete(id); else n.add(id); return n; });
    setNotice(sent ? okText : null);
    if (!sent) setMessage('Rejected, but the message to the seller was not sent. Choose “Send new link” on the listing.');
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
        case 'a': if (target && target.status === 'pending_review') setApproving([target]); break;
        case 'r': if (target && target.status === 'pending_review') setRejecting(target); break;
        case '/': e.preventDefault(); search.current?.focus(); break;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const dateText = !now ? '' : new Date(now).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' });
  const approvedToday = now ? tabs.done.filter((r) => r.approved_at && new Date(r.approved_at).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' }) === new Date(now).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })).length : 0;
  const scopeText = isGlobal ? 'All regions' : regionLabelOf(me.region) || 'Your region';

  const openRow = (r: FeedRow) => { setSelId(r.id); setOpenId(r.id); };
  const badgeTone = (b: string): Tone => (b === 'Unclaimed' ? 'amber' : b === 'Assigned to you' ? 'green' : 'mute');
  const metaLine = (r: FeedRow) => `${categoryLabel(r.category)}${isGlobal ? ` · ${regionLabelOf(r.region)}` : ''} · ${ageLabel(r.condition_age)} · ${workingLabel(r.condition_work)}`;

  function StatusBadge({ r }: { r: FeedRow }) {
    if (r.status === 'pending_review') return <Badge tone={ageTone(r.submitted_at, now)}><span suppressHydrationWarning>Waiting {waitingFor(r.submitted_at, now)}</span></Badge>;
    if (r.status === 'rejected') return <Badge tone="blue">With seller</Badge>;
    return <Badge tone="green">Live</Badge>;
  }

  function Actions({ r, size = '', wide = false }: { r: FeedRow; size?: string; wide?: boolean }) {
    const b = busy === r.id;
    const stop = (fn: () => void) => (e: { stopPropagation: () => void }) => { e.stopPropagation(); fn(); };
    const grow = wide ? 'flex-1' : '';
    if (r.status === 'pending_review') {
      return (
        <div className="flex flex-wrap gap-2">
          {r.assigned_admin_id === null && <button type="button" className={`ops-btn ${size} ${grow}`} disabled={b} onClick={stop(() => act(r, 'claim'))}>Claim</button>}
          <button type="button" className={`ops-btn ops-btn-stop ${size} ${grow}`} disabled={b} onClick={stop(() => setRejecting(r))}>Reject</button>
          <button type="button" className={`ops-btn ops-btn-go ${size} ${grow}`} disabled={b} onClick={stop(() => setApproving([r]))}>Approve</button>
        </div>
      );
    }
    if (r.status === 'rejected') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {failedIds.has(r.id) && <span className="text-xs font-medium text-[var(--p-crit-text)]">Message not sent</span>}
          <button type="button" className={`ops-btn ${size} ${grow}`} disabled={b} onClick={stop(() => resend(r))}>Send new link</button>
        </div>
      );
    }
    return null;
  }

  const COLS = [
    { id: 'unclaimed', title: 'Unclaimed', rows: cols.unclaimed, note: 'Nobody has this yet' },
    { id: 'claimed', title: 'Claimed', rows: cols.claimed, note: 'Mine and my team’s' },
    { id: 'waiting', title: 'Waiting for seller', rows: cols.waiting, note: 'Rejected, fix on the way' },
    { id: 'live', title: 'Approved', rows: cols.liveShown, note: cols.live.length > BOARD_LIVE_MAX ? `Latest ${BOARD_LIVE_MAX} of ${cols.live.length}` : 'In the pool' },
  ];

  const empty = (
    <EmptyState photo="/photos/living-room.webp" icon={<Inbox size={22} />} title={filtered ? 'No listings match those filters' : tab === 'review' ? 'Nothing to review' : 'No listings here'}
      action={filtered ? <button type="button" className="ops-btn" onClick={() => { setQ(''); setRegion(''); setCategory(''); setWho('all'); }}>Clear filters</button> : undefined}>
      {filtered ? 'Try changing or clearing a filter.' : 'Share your link with sellers and new listings will show up here.'}
    </EmptyState>
  );

  const item = view === 'review' ? selected : null;
  const onTouchEnd = (x: number) => {
    const s = touchX.current; touchX.current = null;
    if (s === null) return;
    const dx = x - s;
    if (dx < -70) step(1); else if (dx > 70) step(-1);
  };
  const needsReview = checkedRows.filter((r) => r.status === 'pending_review');
  const claimable = needsReview.filter((r) => r.assigned_admin_id === null);
  const tabCount = (t: LTab) => (t === 'all' ? tabs.review.length + tabs.waiting.length + tabs.done.length : tabs[t].length);

  return (
    <>
      <Page
        title="Review"
        sub={<span suppressHydrationWarning>{scopeText}{dateText ? ` · ${dateText}` : ''}{now && updatedAt ? ` · Updated ${ago(now - updatedAt)}` : ''}</span>}
        actions={<button type="button" onClick={refresh} className="ops-btn" aria-label="Refresh the list"><RefreshCw size={14} aria-hidden="true" />Refresh</button>}
      >
        {message && <Banner tone="crit" onDismiss={() => setMessage(null)}>{message}</Banner>}
        {testLink && (
          <Banner tone="warn" title="Test mode: messages are off, nothing was sent" onDismiss={() => setTestLink(null)}>
            <p>Open this link as the seller of “{testLink.title}” to fix and resubmit it. It works once.</p>
            <p className="mt-2 break-all text-xs">{testLink.url}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="ops-btn" onClick={() => { void navigator.clipboard?.writeText(testLink.url).catch(() => {}); }}>Copy link</button>
              <a className="ops-btn" href={testLink.url} target="_blank" rel="noreferrer">Open link</a>
            </div>
          </Banner>
        )}

        <Metrics items={[
          { label: 'To review', value: stats.pending, tone: 'crit', hint: <span suppressHydrationWarning>{stats.overdue ? `${stats.overdue} over 24 hours` : stats.pending ? `Oldest ${waitingFor(stats.oldest, now)}` : 'All clear'}</span> },
          { label: 'On my plate', value: stats.mine, tone: 'info', hint: `${stats.unclaimed} unclaimed` },
          { label: 'With sellers', value: stats.waiting, tone: 'warn', hint: 'Rejected, waiting on a fix' },
          { label: 'Approved today', value: approvedToday, tone: 'ok', hint: `${tabs.done.length} live in total` },
        ]} />

        <Card pad={false} label="Listings">
          <div className="ops-tabs" role="tablist" aria-label="Listings">
            {TAB_LIST.map((t) => (
              <button key={t.id} role="tab" type="button" aria-selected={view === 'list' ? tab === t.id : false} disabled={view !== 'list'} onClick={() => { setTab(t.id); setChecked(new Set()); }}
                className={view !== 'list' ? 'opacity-50' : ''}>
                {t.label} <span className="ops-tn">{tabCount(t.id)}</span>
              </button>
            ))}
            <span className="ml-auto flex items-center pb-1 pl-3">
              <span className="ops-btngroup" role="group" aria-label="View">
                {(['list', 'board', 'review'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={view === v} onClick={() => { setView(v); setChecked(new Set()); }}>{v === 'list' ? 'Table' : v === 'board' ? 'Board' : 'Review mode'}</button>
                ))}
              </span>
            </span>
          </div>

          <div className="ops-filters">
            <div className="ops-search">
              <label htmlFor="q" className="sr-only">Search title, brand, model or seller</label>
              <Search size={15} aria-hidden="true" />
              <input id="q" ref={search} className="ops-input" type="search" placeholder="Search listings" value={q} maxLength={60} onChange={(e) => setQ(e.target.value)} />
              <kbd className="ops-kbd" aria-hidden="true">/</kbd>
            </div>
            {isGlobal && <FilterSelect label="Region" value={region} onChange={setRegion} options={[{ value: '', label: 'All regions' }, ...stats.perRegion.map(({ v, n }) => ({ value: v, label: `${regionLabelOf(v)} (${n})` }))]} />}
            <FilterSelect label="Category" value={category} onChange={setCategory} options={[{ value: '', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]} />
            <FilterSelect label="Assigned to" value={who} onChange={(v) => setWho(v as Who)} options={[{ value: 'all', label: 'Everyone’s' }, { value: 'unclaimed', label: 'Unclaimed' }, { value: 'mine', label: 'Mine' }]} />
            <FilterSelect strong label="Sort" value={sort} onChange={(v) => setSort(v as Sort)} options={[{ value: 'oldest', label: 'Oldest first' }, { value: 'newest', label: 'Newest first' }, { value: 'price_low', label: 'Price: low to high' }, { value: 'price_high', label: 'Price: high to low' }]} />
            {filtered && <button type="button" className="ops-btn ops-btn-plain ops-btn-sm" onClick={() => { setQ(''); setRegion(''); setCategory(''); setWho('all'); }}><X size={12} aria-hidden="true" />Clear all</button>}
          </div>

          {view === 'list' && checkedRows.length > 0 && (
            <div className="ops-bulk" role="region" aria-label="Selected listings">
              <input type="checkbox" className="ops-checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = someChecked; }} onChange={toggleAll} aria-label="Select all" />
              <span className="text-[13px] font-semibold">{checkedRows.length} selected</span>
              <span className="ml-2 flex flex-wrap gap-2">
                <button type="button" className="ops-btn ops-btn-sm" disabled={claimable.length === 0 || busy !== null} onClick={() => bulk('claim', claimable)}>Claim{claimable.length ? ` (${claimable.length})` : ''}</button>
                <button type="button" className="ops-btn ops-btn-sm ops-btn-stop" disabled={checkedRows.length !== 1 || needsReview.length !== 1 || busy !== null} title={checkedRows.length === 1 ? undefined : 'Reject one at a time so each seller gets their own reason'} onClick={() => needsReview[0] && setRejecting(needsReview[0])}>Reject</button>
                <button type="button" className="ops-btn ops-btn-sm ops-btn-go" disabled={needsReview.length === 0 || busy !== null} onClick={() => setApproving(needsReview)}>Approve{needsReview.length ? ` (${needsReview.length})` : ''}</button>
              </span>
              <button type="button" className="ops-btn ops-btn-plain ops-btn-sm ml-auto" onClick={() => setChecked(new Set())}>Clear selection</button>
            </div>
          )}

          {view === 'board' && (
            <div className="ops-board" aria-label="Pipeline board">
              {COLS.map((c) => (
                <section key={c.id} className="ops-col" aria-label={c.title}>
                  <header className="ops-colh">
                    <h3 className="text-[13px] font-semibold">{c.title}</h3>
                    <span className="ops-chip">{c.id === 'live' ? cols.live.length : c.rows.length}</span>
                  </header>
                  <ul className="ops-colbody ops-scroll">
                    {c.rows.map((r) => {
                      const badge = badgeOf(r, me.id);
                      return (
                        <li key={r.id} className="ops-bcard" data-sel={selected?.id === r.id} onClick={() => openRow(r)}>
                          <div className="flex gap-2.5">
                            <Thumb src={thumbs[r.photo_urls[0]]} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold">{r.title}</p>
                              <p className="ops-mute ops-tnum text-xs">{naira(r.price_ngn)}</p>
                            </div>
                          </div>
                          <p className="ops-mute mt-2 truncate text-xs">{metaLine(r)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5"><StatusBadge r={r} /><Badge tone={badgeTone(badge)} plain>{badge}</Badge></div>
                          {r.status !== 'approved' && <div className="mt-2.5">{Actions({ r, size: 'ops-btn-sm' })}</div>}
                        </li>
                      );
                    })}
                    {c.rows.length === 0 && <li className="ops-mute rounded-lg border border-dashed border-[var(--p-border)] px-3 py-6 text-center text-xs">{c.note}</li>}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {view === 'list' && (
            <>
              {list.length === 0 && empty}

              {list.length > 0 && (
                <div className="ops-tablewrap hidden xl:block">
                  <table className="ops-table" aria-label="Listings">
                    <thead>
                      <tr>
                        <th scope="col"><input type="checkbox" className="ops-checkbox" checked={allChecked} ref={(el) => { if (el) el.indeterminate = someChecked; }} onChange={toggleAll} aria-label="Select all listings" /></th>
                        <th scope="col">Listing</th><th scope="col" className="ops-r">Price</th>{isGlobal && <th scope="col">Region</th>}
                        <th scope="col">Seller</th><th scope="col">Status</th><th scope="col">In charge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => {
                        const badge = badgeOf(r, me.id);
                        return (
                          <tr key={r.id} data-sel={selected?.id === r.id} data-checked={checked.has(r.id)} onClick={() => openRow(r)}>
                            <td onClick={(e) => e.stopPropagation()}><input type="checkbox" className="ops-checkbox" checked={checked.has(r.id)} onChange={() => toggleOne(r.id)} aria-label={`Select ${r.title}`} /></td>
                            <td className="max-w-[320px]">
                              <button type="button" className="flex w-full min-w-0 items-center gap-3 text-left" onClick={(e) => { e.stopPropagation(); openRow(r); }} aria-label={`Open ${r.title}`}>
                                <Thumb src={thumbs[r.photo_urls[0]]} />
                                <span className="min-w-0"><span className="block truncate font-semibold">{r.title}</span><span className="ops-mute block truncate text-xs">{categoryLabel(r.category)} · {ageLabel(r.condition_age)} · {workingLabel(r.condition_work)}</span></span>
                              </button>
                            </td>
                            <td className="ops-num">{naira(r.price_ngn)}</td>
                            {isGlobal && <td className="whitespace-nowrap">{regionLabelOf(r.region)}</td>}
                            <td className="max-w-[180px]"><span className="block truncate">{r.seller_name}</span><span className="ops-mute block truncate text-xs">{r.contact_visible ? r.seller_phone : 'Hidden until claimed'}</span></td>
                            <td><StatusBadge r={r} /></td>
                            <td><Badge tone={badgeTone(badge)} plain>{badge}</Badge></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <ul className="xl:hidden" aria-label="Listings">
                {list.map((r) => {
                  const badge = badgeOf(r, me.id);
                  return (
                    <li key={r.id} className="ops-rowitem" data-sel={selected?.id === r.id}>
                      <button type="button" className="flex w-full min-w-0 gap-3 text-left" onClick={() => openRow(r)} aria-label={`Open ${r.title}`}>
                        <Thumb src={thumbs[r.photo_urls[0]]} large />
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex items-start justify-between gap-2"><span className="truncate text-[13px] font-semibold">{r.title}</span><span className="ops-tnum flex-none text-[13px] font-semibold">{naira(r.price_ngn)}</span></span>
                          <span className="ops-mute truncate text-xs">{metaLine(r)}</span>
                          <span className="flex flex-wrap items-center gap-1.5"><StatusBadge r={r} /><Badge tone={badgeTone(badge)} plain>{badge}</Badge></span>
                        </span>
                      </button>
                      {r.status !== 'approved' && Actions({ r, size: '', wide: true })}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {view === 'review' && (
            <div className="p-3 sm:p-5" aria-label="Review mode">
              {!item ? empty : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]"
                  onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }} onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <p className="ops-tnum text-[13px] font-semibold">{selIdx + 1} <span className="ops-mute font-normal">of {list.length}</span></p>
                      <div className="ops-progress flex-1" aria-hidden="true"><i style={{ flexGrow: selIdx + 1 }} /><i style={{ flexGrow: Math.max(0, list.length - selIdx - 1), background: 'transparent' }} /></div>
                    </div>
                    <button type="button" className="ops-hero-photo aspect-[4/3] max-h-[560px] w-full" onClick={() => openRow(item)} aria-label={`Open ${item.title}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {thumbs[item.photo_urls[0]] ? <img src={thumbs[item.photo_urls[0]]} alt="" className="h-full w-full object-cover" /> : <span className="ops-mute flex h-full w-full items-center justify-center text-[13px]">No photo</span>}
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-1.5"><StatusBadge r={item} /><Badge tone={badgeTone(badgeOf(item, me.id))} plain>{badgeOf(item, me.id)}</Badge></div>
                    <h2 className="text-xl font-semibold leading-7">{item.title}</h2>
                    <p className="ops-tnum text-2xl font-semibold">{naira(item.price_ngn)}</p>
                    <p className="ops-mute text-[13px]">{metaLine(item)}</p>
                    <p className="line-clamp-4 text-[13px] leading-5">{item.description}</p>
                    <p className="text-[13px]"><span className="font-semibold">{item.seller_name}</span> <span className="ops-mute">· {item.contact_visible ? item.seller_phone : 'Contact shows once you are in charge'}</span></p>
                    <div className="ops-actionbar !fixed inset-x-0 z-20 lg:!static lg:!border-0 lg:!bg-transparent lg:!p-0 max-lg:!bottom-[calc(56px+env(safe-area-inset-bottom))]">
                      {Actions({ r: item, size: 'ops-btn-lg', wide: true })}
                      <button type="button" className="ops-btn ops-btn-lg" onClick={() => step(1)} disabled={list.length < 2}>Skip</button>
                      <button type="button" className="ops-btn ops-btn-lg" onClick={() => openRow(item)}>Details <ArrowRight size={14} aria-hidden="true" /></button>
                    </div>
                    <div className="h-24 lg:hidden" aria-hidden="true" />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="ops-tablefoot">
            <span className="ops-tnum" aria-live="polite">{view === 'board' ? `${list.length} shown` : `${list.length} ${list.length === 1 ? 'listing' : 'listings'}${filtered ? ' match' : ''}`}</span>
            <span className="hidden items-center gap-3 text-xs lg:flex" aria-label="Keyboard shortcuts">
              <span><kbd className="ops-kbd">J</kbd> <kbd className="ops-kbd">K</kbd> move</span>
              <span><kbd className="ops-kbd">Enter</kbd> open</span>
              <span><kbd className="ops-kbd">C</kbd> claim</span>
              <span><kbd className="ops-kbd">A</kbd> approve</span>
              <span><kbd className="ops-kbd">R</kbd> reject</span>
              <span><kbd className="ops-kbd">/</kbd> search</span>
            </span>
          </div>
        </Card>

        {link && (
          <Card title="Your link for sellers" label="Your referral link">
            <p className="ops-mute mb-3 text-[13px]">Anyone who lists through this link lands in your region and on your desk.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input readOnly value={link} className="ops-input min-w-0 flex-1" aria-label="Your link for sellers" onFocus={(e) => e.currentTarget.select()} />
              <div className="flex gap-2">
                <button type="button" className="ops-btn flex-1 sm:flex-none" onClick={copy}>{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied ? 'Copied' : 'Copy link'}</button>
                <a className="ops-btn ops-btn-primary flex-1 sm:flex-none" href={whatsappShareUrl(link)} target="_blank" rel="noopener noreferrer"><Share2 size={14} aria-hidden="true" />WhatsApp</a>
              </div>
            </div>
          </Card>
        )}
      </Page>

      {open && (
        <ListingDetail
          row={open}
          me={me.id}
          busy={busy === open.id}
          now={now}
          onClose={() => setOpenId(null)}
          onClaim={() => act(open, 'claim')}
          onApprove={() => setApproving([open])}
          onReject={() => setRejecting(open)}
          onResend={() => resend(open)}
          onPrev={openIdx > 0 ? () => go(openIdx - 1) : undefined}
          onNext={openIdx >= 0 && openIdx < list.length - 1 ? () => go(openIdx + 1) : undefined}
        />
      )}
      {approving && (
        <ConfirmDialog title={approving.length === 1 ? 'Approve this listing?' : `Approve ${approving.length} listings?`} confirmLabel={approving.length === 1 ? 'Approve' : `Approve ${approving.length}`} busy={busy !== null}
          body={approving.length === 1
            ? <><p><b className="font-semibold">{approving[0].title}</b> · {naira(approving[0].price_ngn)}</p><p className="ops-mute mt-1">It goes live in the pool for buyers.</p></>
            : <><ul className="max-h-40 list-disc overflow-y-auto pl-5">{approving.map((r) => <li key={r.id}>{r.title} · {naira(r.price_ngn)}</li>)}</ul><p className="ops-mute mt-2">They go live in the pool for buyers.</p></>}
          onCancel={() => setApproving(null)} onConfirm={() => (approving.length === 1 ? act(approving[0], 'approve') : bulk('approve', approving))} />
      )}
      {rejecting && (
        <RejectModal title={rejecting.title} busy={busy === rejecting.id} onCancel={() => setRejecting(null)} onSubmit={(reason) => reject(rejecting, reason)} />
      )}
      {notice && <Toast onClose={() => setNotice(null)}>{notice}</Toast>}
    </>
  );
}
