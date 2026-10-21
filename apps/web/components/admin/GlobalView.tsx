'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, ShieldAlert, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/auth/client';
import { naira, referralLink, type FeedRow } from '@/lib/admin/inbox';
import {
  actionText, auditReason, canBlacklist, canReinstate, canRevoke, countsFor, eligibleTargets, filterListings, nameMatches, orphaned, statusOf,
  type AdminRow, type AuditRow,
} from '@/lib/admin/overview';
import { validateReason } from '@/lib/admin/reasons';
import { REGIONS } from '@/lib/listing/schema';
import { Band, BigStat, Badge, Dialog, Hero, Notice, regionLabelOf, type Tone } from './ui';

const regionLabel = regionLabelOf;
const LISTING_STEP = 24;
const AUDIT_STEP = 25;
const PALETTE = ['#D32F2F', '#16A34A', '#2563EB'];
type Dialog =
  | { kind: 'revoke' | 'blacklist'; admin: AdminRow }
  | { kind: 'reassign'; listing: FeedRow }
  | { kind: 'add' }
  | null;

export function GlobalView({ siteUrl, admins, listings, audit }: {
  siteUrl: string; admins: AdminRow[]; listings: FeedRow[]; audit: AuditRow[];
}) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [listCount, setListCount] = useState(LISTING_STEP);
  const [auditCount, setAuditCount] = useState(AUDIT_STEP);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [filters, setFilters] = useState({ region: '', status: '', admin: '' });
  const nameOf = useMemo(() => new Map(admins.map((a) => [a.id, a.full_name || a.phone])), [admins]);
  const orphans = useMemo(() => orphaned(listings, admins), [listings, admins]);
  const shown = useMemo(() => filterListings(listings, filters), [listings, filters]);

  async function run(url: string, body: unknown, okText: string) {
    const r = await postJson<{ warning?: string }>(url, body);
    if (!r.ok) { setMessage({ ok: false, text: r.error.message }); return false; }
    setMessage({ ok: true, text: r.data.warning ?? okText });
    setDialog(null);
    router.refresh();
    return true;
  }

  const active = admins.filter((a) => statusOf(a) === 'Active').length;
  const pendingAll = listings.filter((l) => l.status === 'pending_review').length;
  const approvedAll = listings.filter((l) => l.status === 'approved').length;
  const statusTone = (st: string): Tone => (st === 'Active' ? 'green' : st === 'Revoked' ? 'amber' : 'red');
  const initials = (n: string) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const byRegion = REGIONS.map((r) => ({
    ...r,
    pending: listings.filter((l) => l.region === r.value && l.status === 'pending_review').length,
    approved: listings.filter((l) => l.region === r.value && l.status === 'approved').length,
  }));
  const maxRegion = Math.max(1, ...byRegion.map((r) => r.pending + r.approved));
  const statusColor = (st: string) => (st === 'approved' ? '#16A34A' : st === 'rejected' ? '#F59E0B' : '#D32F2F');

  async function copyLink(id: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch { setMessage({ ok: false, text: 'Copy did not work. Press and hold the link to copy it.' }); }
  }

  const sections = [['numbers', 'Numbers'], ['regions', 'Regions'], ['admins', 'Admins'], ['listings', 'Listings'], ['audit', 'Audit']] as const;

  return (
    <>
      <Hero
        eyebrow={<>All regions · every admin</>}
        title={<>{pendingAll > 0 ? <><span className="text-[var(--o-red-t)]">{pendingAll}</span> {pendingAll === 1 ? 'listing needs' : 'listings need'} a review.</> : <>Everything is reviewed.</>}</>}
        sub="Admins, every listing and the audit trail across all regions."
        actions={<>
          <button type="button" className="ops-btn ops-btn-cta" onClick={() => setDialog({ kind: 'add' })}><UserPlus size={16} aria-hidden="true" />Add admin</button>
          <nav aria-label="Sections" className="ops-seg max-w-[calc(100vw-28px)]">
            {sections.map(([id, label]) => (
              <button key={id} type="button" onClick={() => document.getElementById(`g-${id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}>{label}</button>
            ))}
          </nav>
        </>}
      >
        <section id="g-numbers" aria-label="Platform at a glance" className="scroll-mt-24">
          <div className="ops-kpis ops-kpis-5">
            <BigStat label="Active admins" value={active} tone="green" hint={`${admins.length} in total`} />
            <BigStat label="Waiting review" value={pendingAll} tone="red" />
            <BigStat label="Live in the pool" value={approvedAll} tone="blue" />
            <BigStat label="Listings loaded" value={listings.length} tone="amber" hint="Latest 300" />
            <BigStat label="Need an admin" value={orphans.length} tone={orphans.length ? 'red' : 'green'} hint={orphans.length ? 'Reassign below' : 'All covered'} />
          </div>
        </section>
      </Hero>

      {message && <div className="ops-inner pt-6"><Notice kind={message.ok ? 'ok' : 'error'}>{message.text}</Notice></div>}

      <Band id="g-regions" label="Pending and approved by region">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="ops-h2">Region by region</h2>
          <p className="flex items-center gap-4 text-[13px] font-medium"><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-brand-red" />Pending</span><span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[#16A34A]" />Approved</span></p>
        </div>
        <ul className="ops-tile mt-4 flex flex-col gap-5 p-5 sm:p-6">
          {byRegion.map((r) => (
            <li key={r.value} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[160px_1fr_130px]">
              <p className="text-[13.5px] font-semibold">{r.label}</p>
              <div className="ops-bar !h-2" role="img" aria-label={`${r.label}: ${r.pending} pending, ${r.approved} approved`} style={{ width: `${Math.max(6, ((r.pending + r.approved) / maxRegion) * 100)}%` }}>
                <i className="bg-brand-red" style={{ flexGrow: r.pending }} /><i className="bg-brand-green" style={{ flexGrow: r.approved }} />
              </div>
              <p className="text-[13px] font-medium sm:text-right"><span className="text-[var(--o-red-t)]">{r.pending}</span> pending · <span className="text-[var(--o-green-t)]">{r.approved}</span> live</p>
            </li>
          ))}
        </ul>
      </Band>

      <Band id="g-admins" label="Admins">
        <h2 className="ops-h2">The team <span className="ops-mute">{admins.length}</span></h2>
        <ul className="mt-4 grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {admins.map((a, i) => {
            const c = countsFor(a.id, listings);
            const st = statusOf(a);
            const link = a.referral_code ? referralLink(siteUrl, a.referral_code) : null;
            return (
              <li key={a.id} className="ops-tile ops-lift flex min-w-0 flex-col gap-3.5 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl text-[15px] font-extrabold text-white" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden="true">{initials(a.full_name || a.phone)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold">{a.full_name || 'No name yet'}</p>
                    <p className="mt-1 flex flex-wrap gap-1.5"><span className="ops-chip">{a.role === 'global_admin' ? 'Global Admin' : 'Regional'}</span>{a.role !== 'global_admin' && <span className="ops-chip">{regionLabel(a.region)}</span>}</p>
                    <p className="ops-mute mt-1 text-[12.5px]">{a.phone}</p>
                  </div>
                  <Badge tone={statusTone(st)}>{st}</Badge>
                </div>
                <div className="flex gap-8">
                  <div><p className="ops-num text-3xl text-[var(--o-red-t)]">{c.pending}</p><p className="ops-mute text-xs">pending</p></div>
                  <div><p className="ops-num text-3xl text-[var(--o-green-t)]">{c.approved}</p><p className="ops-mute text-xs">approved</p></div>
                </div>
                {link && (
                  <div className="flex items-center gap-2 rounded-full bg-[var(--o-card2)] p-1.5 pl-4">
                    <p className="min-w-0 flex-1 truncate text-[13px] font-medium">{link}</p>
                    <button type="button" className="ops-btn ops-btn-sm" onClick={() => copyLink(a.id, link)} aria-label={`Copy ${a.full_name || 'admin'}’s referral link`}>
                      {copiedId === a.id ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}{copiedId === a.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
                <p className="ops-mute text-xs">Last change {new Date(a.updated_at).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}</p>
                {a.status_reason && <p className="ops-card2 p-3 text-[13px]">Reason: {a.status_reason}</p>}
                {(canRevoke(a) || canReinstate(a) || canBlacklist(a)) && (
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    {canRevoke(a) && <button type="button" className="ops-btn" onClick={() => setDialog({ kind: 'revoke', admin: a })}>Revoke</button>}
                    {canReinstate(a) && <button type="button" className="ops-btn ops-btn-go" onClick={() => run('/api/admin/status', { action: 'reinstate', profile_id: a.id }, 'Admin reinstated.')}>Reinstate</button>}
                    {canBlacklist(a) && <button type="button" className="ops-btn ops-btn-stop" onClick={() => setDialog({ kind: 'blacklist', admin: a })}>Blacklist</button>}
                  </div>
                )}
              </li>
            );
          })}
          {admins.length === 0 && <li className="ops-mute col-span-full py-12 text-lg font-semibold">No admins yet. Add the first one.</li>}
        </ul>
      </Band>

      <Band id="g-listings" label="Listings" className="flex flex-col gap-4">
        <h2 className="ops-h2">Every listing <span className="ops-mute">{shown.length}</span></h2>
        {orphans.length > 0 && (
          <div className="rounded-2xl border border-[var(--b-red-ln)] bg-[var(--b-red-bg)] p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--b-red-fg)]"><ShieldAlert size={16} aria-hidden="true" />Needs a new admin in charge ({orphans.length})</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {orphans.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 rounded-full bg-[var(--o-card)] p-2 pl-4">
                  <span className="min-w-0 truncate text-sm font-bold">{l.title} · {regionLabel(l.region)}</span>
                  <button type="button" className="ops-btn ops-btn-red ops-btn-sm" onClick={() => setDialog({ kind: 'reassign', listing: l })}>Reassign</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid gap-2 md:grid-cols-3">
          <label className="sr-only" htmlFor="f-region">Region</label>
          <select id="f-region" className="ops-input" value={filters.region} onChange={(e) => { setFilters({ ...filters, region: e.target.value }); setListCount(LISTING_STEP); }}>
            <option value="">All regions</option>{REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="f-status">Status</label>
          <select id="f-status" className="ops-input" value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setListCount(LISTING_STEP); }}>
            <option value="">Any status</option><option value="pending_review">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
          </select>
          <label className="sr-only" htmlFor="f-admin">Admin in charge</label>
          <select id="f-admin" className="ops-input" value={filters.admin} onChange={(e) => { setFilters({ ...filters, admin: e.target.value }); setListCount(LISTING_STEP); }}>
            <option value="">Any admin</option><option value="none">Unassigned</option>{admins.map((a) => <option key={a.id} value={a.id}>{a.full_name || a.phone}</option>)}
          </select>
        </div>
        {shown.length === 0 && <p className="ops-mute py-6 text-[13px]">No listings match.</p>}
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.slice(0, listCount).map((l) => (
            <li key={l.id} className="ops-tile ops-lift flex min-w-0 flex-col gap-2 overflow-hidden p-4" style={{ borderTop: `3px solid ${statusColor(l.status)}` }}>
              <div className="flex items-start justify-between gap-3">
                <p className="ops-num text-2xl">{naira(l.price_ngn)}</p>
                <Badge tone={l.status === 'approved' ? 'green' : l.status === 'rejected' ? 'amber' : 'red'}>{l.status.replace('_', ' ')}</Badge>
              </div>
              <p className="text-sm font-semibold leading-tight">{l.title}</p>
              <p className="ops-mute text-[13px]">{regionLabel(l.region)} · Seller {l.seller_name} · {l.seller_phone}</p>
              <p className="text-[13px] font-medium">In charge: {l.assigned_admin_id ? nameOf.get(l.assigned_admin_id) ?? l.admin_in_charge_name ?? 'Unknown' : 'Nobody yet'}</p>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                <button type="button" className="ops-btn" onClick={() => setDialog({ kind: 'reassign', listing: l })}>Reassign</button>
                {l.status === 'pending_review' && <a className="ops-btn ops-btn-blue" href="/admin/dashboard">Review</a>}
              </div>
            </li>
          ))}
        </ul>
        {shown.length > listCount && <button type="button" className="ops-btn mx-auto min-w-48" onClick={() => setListCount((n) => n + LISTING_STEP)}>Show more ({shown.length - listCount} left)</button>}
      </Band>

      <Band id="g-audit" label="Audit log" className="pb-6">
        <h2 className="ops-h2">Audit trail <span className="ops-mute">{audit.length}</span></h2>
        <ol className="ops-tile ops-timeline mt-4 flex max-w-3xl flex-col p-5 sm:p-6">
          {audit.slice(0, auditCount).map((a, i) => {
            const d = new Date(a.created_at);
            const day = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
            const prev = i > 0 ? new Date(audit[i - 1].created_at).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }) : null;
            return (
              <li key={a.id}>
                {day !== prev && <p className="ops-eyebrow mb-2 mt-6 first:mt-0">{day}</p>}
                <div className="grid grid-cols-[64px_20px_1fr] gap-x-3 border-b border-[var(--o-line)] py-3">
                  <p className="ops-mute pt-0.5 text-sm font-bold tabular-nums">{d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })}</p>
                  <span className="mt-1.5 h-2 w-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden="true" />
                  <div className="text-[13.5px]">
                    <p><span className="font-semibold">{a.actor_id ? nameOf.get(a.actor_id) ?? 'An admin' : 'A seller'}</span> {actionText(a.action)}</p>
                    {auditReason(a.detail) && <p className="ops-mute">Reason: {auditReason(a.detail)}</p>}
                  </div>
                </div>
              </li>
            );
          })}
          {audit.length === 0 && <li className="ops-mute py-6 text-[13px]">Nothing yet.</li>}
        </ol>
        {audit.length > auditCount && <button type="button" className="ops-btn mt-6" onClick={() => setAuditCount((n) => n + AUDIT_STEP)}>Show older ({audit.length - auditCount} more)</button>}
      </Band>

      {dialog?.kind === 'add' && <AddAdmin onCancel={() => setDialog(null)} onDone={(b) => run('/api/admin/create', b, 'Admin added. They can sign in with a WhatsApp code now.')} />}
      {dialog?.kind === 'revoke' && (
        <ReasonDialog title={`Revoke ${dialog.admin.full_name || dialog.admin.phone}`} help="Their pending listings go back to the open queue. You can reinstate them later."
          action="Revoke" onCancel={() => setDialog(null)}
          onDone={(reason) => run('/api/admin/status', { action: 'revoke', profile_id: dialog.admin.id, reason }, 'Admin revoked.')} />
      )}
      {dialog?.kind === 'blacklist' && (
        <ReasonDialog title={`Blacklist ${dialog.admin.full_name || dialog.admin.phone}`} confirmName={dialog.admin.full_name}
          help="This is permanent. They are signed out, blocked, and the number can never be added again."
          action="Blacklist for good" danger onCancel={() => setDialog(null)}
          onDone={(reason) => run('/api/admin/blacklist', { profile_id: dialog.admin.id, reason }, 'Admin blacklisted.')} />
      )}
      {dialog?.kind === 'reassign' && (
        <ReassignDialog listing={dialog.listing} targets={eligibleTargets(dialog.listing, admins)} onCancel={() => setDialog(null)}
          onDone={(to, reason) => run('/api/listings/reassign', { listing_id: dialog.listing.id, new_admin_id: to, reason }, 'Admin in charge changed.')} />
      )}
    </>
  );
}

function Shell({ title, children, onCancel }: { title: string; children: React.ReactNode; onCancel: () => void }) {
  return <Dialog title={title} onClose={onCancel}>{children}</Dialog>;
}

function ReasonDialog({ title, help, action, confirmName, danger, onCancel, onDone }: {
  title: string; help: string; action: string; confirmName?: string; danger?: boolean; onCancel: () => void; onDone: (reason: string) => Promise<boolean>;
}) {
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const needsName = confirmName !== undefined;
  async function go() {
    const v = validateReason(reason);
    if (!v.ok) return setError(v.message);
    if (needsName && !nameMatches(typed, confirmName)) return setError('Type the admin’s full name to confirm.');
    setBusy(true);
    const done = await onDone(v.reason);
    if (!done) setBusy(false);
  }
  return (
    <Shell title={title} onCancel={onCancel}>
      <p className="ops-mute text-sm">{help}</p>
      <label htmlFor="g-reason" className="text-[13.5px] font-semibold">Reason</label>
      <textarea id="g-reason" className="ops-input min-h-24" rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
      {needsName && (
        <>
          <label htmlFor="g-confirm" className="text-[13.5px] font-semibold">Type “{confirmName}” to confirm</label>
          <input id="g-confirm" className="ops-input" value={typed} autoComplete="off" onChange={(e) => { setTyped(e.target.value); setError(null); }} />
        </>
      )}
      {error && <p role="alert" className="text-sm text-[var(--o-red-t)]">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="ops-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={`ops-btn ${danger ? 'ops-btn-red' : 'ops-btn-go'}`} onClick={go} disabled={busy}>{busy ? 'Working…' : action}</button>
      </div>
    </Shell>
  );
}

function ReassignDialog({ listing, targets, onCancel, onDone }: {
  listing: FeedRow; targets: AdminRow[]; onCancel: () => void; onDone: (to: string, reason: string) => Promise<boolean>;
}) {
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    const v = validateReason(reason);
    if (!to) return setError('Choose an admin.');
    if (!v.ok) return setError(v.message);
    setBusy(true);
    if (!(await onDone(to, v.reason))) setBusy(false);
  }
  return (
    <Shell title={`Reassign “${listing.title}”`} onCancel={onCancel}>
      {targets.length === 0 ? <p className="text-[var(--o-red-t)]">No other active admin in this region.</p> : (
        <>
          <label htmlFor="g-to" className="text-[13.5px] font-semibold">New admin in charge</label>
          <select id="g-to" className="ops-input" value={to} onChange={(e) => { setTo(e.target.value); setError(null); }}>
            <option value="">Choose…</option>
            {targets.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.phone} ({t.role === 'global_admin' ? 'Global' : regionLabel(t.region)})</option>)}
          </select>
          <label htmlFor="g-why" className="text-[13.5px] font-semibold">Reason</label>
          <textarea id="g-why" className="ops-input min-h-24" rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
        </>
      )}
      {error && <p role="alert" className="text-sm text-[var(--o-red-t)]">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="ops-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="ops-btn ops-btn-go" onClick={go} disabled={busy || targets.length === 0}>{busy ? 'Working…' : 'Reassign'}</button>
      </div>
    </Shell>
  );
}

function AddAdmin({ onCancel, onDone }: { onCancel: () => void; onDone: (b: unknown) => Promise<boolean> }) {
  const [v, setV] = useState({ phone: '', full_name: '', role: 'regional_admin', region: 'port_harcourt' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function go() {
    if (v.full_name.trim().length < 2) return setError('Add the name.');
    if (v.phone.trim().length < 10) return setError('Enter a Nigerian phone number, for example 0803 123 4567.');
    setBusy(true);
    if (!(await onDone({ ...v, region: v.role === 'regional_admin' ? v.region : null }))) setBusy(false);
  }
  return (
    <Shell title="Add admin" onCancel={onCancel}>
      <label htmlFor="n-name" className="text-[13.5px] font-semibold">Name</label>
      <input id="n-name" className="ops-input" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      <label htmlFor="n-phone" className="text-[13.5px] font-semibold">Phone</label>
      <input id="n-phone" className="ops-input" type="tel" inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
      <label htmlFor="n-role" className="text-[13.5px] font-semibold">Role</label>
      <select id="n-role" className="ops-input" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>
        <option value="regional_admin">Regional admin</option><option value="global_admin">Global admin</option>
      </select>
      {v.role === 'regional_admin' && (
        <>
          <label htmlFor="n-region" className="text-[13.5px] font-semibold">Region</label>
          <select id="n-region" className="ops-input" value={v.region} onChange={(e) => setV({ ...v, region: e.target.value })}>
            {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </>
      )}
      {error && <p role="alert" className="text-sm text-[var(--o-red-t)]">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="ops-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="ops-btn ops-btn-cta" onClick={go} disabled={busy}>{busy ? 'Adding…' : 'Add admin'}</button>
      </div>
    </Shell>
  );
}
