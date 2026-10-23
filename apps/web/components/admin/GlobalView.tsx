'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, ShieldAlert, Users, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/auth/client';
import { naira, referralLink, type FeedRow } from '@/lib/admin/inbox';
import {
  actionText, auditReason, canBlacklist, canReinstate, canRevoke, countsFor, eligibleTargets, filterListings, nameMatches, orphaned, statusOf,
  type AdminRow, type AuditRow,
} from '@/lib/admin/overview';
import { validateReason } from '@/lib/admin/reasons';
import { REGIONS } from '@/lib/listing/schema';
import { Badge, Banner, Card, Dialog, EmptyState, Metrics, Page, regionLabelOf, Toast, type Tone } from './ui';

const regionLabel = regionLabelOf;
const LISTING_STEP = 24;
const AUDIT_STEP = 25;
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
    if (r.data.warning) setMessage({ ok: true, text: r.data.warning }); else setToast(okText);
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
  async function copyLink(id: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch { setMessage({ ok: false, text: 'Copy did not work. Press and hold the link to copy it.' }); }
  }

  const sections = [['numbers', 'Numbers'], ['regions', 'Regions'], ['admins', 'Team'], ['listings', 'Listings'], ['audit', 'Audit']] as const;
  const goTo = (id: string) => document.getElementById(`g-${id}`)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  const listingTone = (st: string): Tone => (st === 'approved' ? 'green' : st === 'rejected' ? 'blue' : 'amber');
  const listingLabel = (st: string) => (st === 'approved' ? 'Approved' : st === 'rejected' ? 'Rejected' : 'Pending');
  const chargeOf = (l: FeedRow) => (l.assigned_admin_id ? nameOf.get(l.assigned_admin_id) ?? l.admin_in_charge_name ?? 'Unknown' : 'Nobody yet');
  const roleText = (a: AdminRow) => (a.role === 'global_admin' ? 'Global admin' : 'Regional admin');
  const [toast, setToast] = useState<string | null>(null);

  function AdminActions({ a }: { a: AdminRow }) {
    return (
      <div className="flex flex-wrap gap-2">
        {canRevoke(a) && <button type="button" className="ops-btn ops-btn-sm" onClick={() => setDialog({ kind: 'revoke', admin: a })}>Revoke</button>}
        {canReinstate(a) && <button type="button" className="ops-btn ops-btn-sm ops-btn-primary" onClick={() => run('/api/admin/status', { action: 'reinstate', profile_id: a.id }, 'Admin reinstated.')}>Reinstate</button>}
        {canBlacklist(a) && <button type="button" className="ops-btn ops-btn-sm ops-btn-stop" onClick={() => setDialog({ kind: 'blacklist', admin: a })}>Blacklist</button>}
      </div>
    );
  }
  function CopyLink({ a }: { a: AdminRow }) {
    const link = a.referral_code ? referralLink(siteUrl, a.referral_code) : null;
    if (!link) return <span className="ops-mute text-xs">No link</span>;
    return (
      <button type="button" className="ops-btn ops-btn-sm" onClick={() => copyLink(a.id, link)} aria-label={`Copy ${a.full_name || 'admin'}’s referral link`}>
        {copiedId === a.id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}{copiedId === a.id ? 'Copied' : 'Copy link'}
      </button>
    );
  }
  function ListingActions({ l }: { l: FeedRow }) {
    return (
      <div className="flex gap-2">
        <button type="button" className="ops-btn ops-btn-sm" onClick={() => setDialog({ kind: 'reassign', listing: l })}>Reassign</button>
        {l.status === 'pending_review' && <a className="ops-btn ops-btn-sm" href="/admin/dashboard">Review</a>}
      </div>
    );
  }

  return (
    <Page
      title="Global"
      sub="All regions · every admin, every listing and the audit trail."
      actions={<button type="button" className="ops-btn ops-btn-primary" onClick={() => setDialog({ kind: 'add' })}><UserPlus size={14} aria-hidden="true" />Add admin</button>}
    >
      {message && <Banner tone={message.ok ? 'ok' : 'crit'} onDismiss={() => setMessage(null)}>{message.text}</Banner>}

      <div className="ops-tabs !border-0 !p-0" role="navigation" aria-label="Sections">
        {sections.map(([id, label]) => <button key={id} type="button" onClick={() => goTo(id)}>{label}</button>)}
      </div>

      <div id="g-numbers" className="ops-section">
        <Metrics five items={[
          { label: 'Active admins', value: active, tone: 'ok', hint: `${admins.length} in total` },
          { label: 'Waiting review', value: pendingAll, tone: 'crit' },
          { label: 'Live in the pool', value: approvedAll, tone: 'info' },
          { label: 'Listings loaded', value: listings.length, hint: 'Latest 300' },
          { label: 'Need an admin', value: orphans.length, tone: orphans.length ? 'crit' : 'ok', hint: orphans.length ? 'Reassign below' : 'All covered' },
        ]} />
      </div>

      <Card id="g-regions" title="Regions" label="Pending and approved by region"
        actions={<p className="flex items-center gap-4 text-xs"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--p-crit)]" />Pending</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[var(--p-ok)]" />Approved</span></p>}>
        <ul className="flex flex-col gap-4">
          {byRegion.map((r) => (
            <li key={r.value} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[150px_1fr_140px]">
              <p className="text-[13px] font-semibold">{r.label}</p>
              <div className="ops-bar" role="img" aria-label={`${r.label}: ${r.pending} pending, ${r.approved} approved`} style={{ width: `${Math.max(6, ((r.pending + r.approved) / maxRegion) * 100)}%` }}>
                <i className="bg-[var(--p-crit)]" style={{ flexGrow: r.pending }} /><i className="bg-[var(--p-ok)]" style={{ flexGrow: r.approved }} />
              </div>
              <p className="ops-tnum text-xs sm:text-right"><span className="text-[var(--p-crit-text)]">{r.pending} pending</span> · <span className="text-[var(--p-ok-text)]">{r.approved} live</span></p>
            </li>
          ))}
        </ul>
      </Card>

      <Card id="g-admins" title={`Team (${admins.length})`} pad={false} label="Admins">
        {admins.length === 0 ? (
          <EmptyState icon={<Users size={22} />} title="No admins yet" action={<button type="button" className="ops-btn ops-btn-primary" onClick={() => setDialog({ kind: 'add' })}>Add the first admin</button>} />
        ) : (
          <>
            <div className="ops-tablewrap mt-3 hidden xl:block">
              <table className="ops-table" aria-label="Admins">
                <thead><tr><th scope="col" className="!w-auto !pl-4">Admin</th><th scope="col">Role</th><th scope="col">Region</th><th scope="col">Status</th><th scope="col" className="ops-r">Pending</th><th scope="col" className="ops-r">Approved</th><th scope="col">Referral link</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {admins.map((a) => {
                    const c = countsFor(a.id, listings);
                    const st = statusOf(a);
                    return (
                      <tr key={a.id} style={{ cursor: 'default' }}>
                        <td className="!w-auto !pl-4">
                          <div className="flex items-center gap-2.5">
                            <span className="ops-avatar ops-avatar-n" aria-hidden="true">{initials(a.full_name || a.phone)}</span>
                            <span className="min-w-0"><span className="block truncate font-semibold">{a.full_name || 'No name yet'}</span><span className="ops-mute block text-xs ops-tnum">{a.phone}</span>{a.status_reason && <span className="ops-mute block max-w-[220px] truncate text-xs">Reason: {a.status_reason}</span>}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">{roleText(a)}</td>
                        <td className="whitespace-nowrap">{a.role === 'global_admin' ? 'All regions' : regionLabel(a.region)}</td>
                        <td><Badge tone={statusTone(st)}>{st}</Badge></td>
                        <td className="ops-num">{c.pending}</td>
                        <td className="ops-num">{c.approved}</td>
                        <td><CopyLink a={a} /></td>
                        <td><AdminActions a={a} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="mt-3 xl:hidden">
              {admins.map((a) => {
                const c = countsFor(a.id, listings);
                const st = statusOf(a);
                return (
                  <li key={a.id} className="ops-rowitem">
                    <div className="flex items-start gap-3">
                      <span className="ops-avatar ops-avatar-n" aria-hidden="true">{initials(a.full_name || a.phone)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{a.full_name || 'No name yet'}</p>
                        <p className="ops-mute text-xs">{roleText(a)}{a.role !== 'global_admin' ? ` · ${regionLabel(a.region)}` : ''} · <span className="ops-tnum">{a.phone}</span></p>
                        <p className="ops-mute ops-tnum mt-0.5 text-xs">{c.pending} pending · {c.approved} approved</p>
                        {a.status_reason && <p className="ops-mute mt-0.5 text-xs">Reason: {a.status_reason}</p>}
                      </div>
                      <Badge tone={statusTone(st)}>{st}</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2"><CopyLink a={a} /><AdminActions a={a} /></div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {orphans.length > 0 && (
        <Banner tone="crit" title={`Needs a new admin in charge (${orphans.length})`}>
          <ul className="mt-2 flex flex-col gap-1.5">
            {orphans.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 truncate"><ShieldAlert size={13} aria-hidden="true" className="flex-none" />{l.title} · {regionLabel(l.region)}</span>
                <button type="button" className="ops-btn ops-btn-sm ops-btn-red" onClick={() => setDialog({ kind: 'reassign', listing: l })}>Reassign</button>
              </li>
            ))}
          </ul>
        </Banner>
      )}

      <Card id="g-listings" title={`Every listing (${shown.length})`} pad={false} label="Listings">
        <div className="ops-filters">
          {([
            ['region', 'Region', [{ value: '', label: 'All regions' }, ...REGIONS.map((r) => ({ value: r.value as string, label: r.label }))]],
            ['status', 'Status', [{ value: '', label: 'Any status' }, { value: 'pending_review', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]],
            ['admin', 'In charge', [{ value: '', label: 'Any admin' }, { value: 'none', label: 'Unassigned' }, ...admins.map((a) => ({ value: a.id, label: a.full_name || a.phone }))]],
          ] as const).map(([key, label, opts]) => {
            const cur = opts.find((o) => o.value === filters[key]);
            return (
              <label key={key} className="ops-filterbtn" data-on={Boolean(filters[key])}>
                <span>{filters[key] ? `${label}: ${cur?.label ?? ''}` : label}</span>
                <select aria-label={label} value={filters[key]} onChange={(e) => { setFilters({ ...filters, [key]: e.target.value }); setListCount(LISTING_STEP); }}>
                  {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            );
          })}
          {(filters.region || filters.status || filters.admin) && <button type="button" className="ops-btn ops-btn-plain ops-btn-sm" onClick={() => { setFilters({ region: '', status: '', admin: '' }); setListCount(LISTING_STEP); }}>Clear all</button>}
        </div>
        {shown.length === 0 && <EmptyState icon={<ShieldAlert size={22} />} title="No listings match" />}

        {shown.length > 0 && (
          <div className="ops-tablewrap hidden xl:block">
            <table className="ops-table" aria-label="Listings">
              <thead><tr><th scope="col" className="!w-auto !pl-4">Listing</th><th scope="col" className="ops-r">Price</th><th scope="col">Region</th><th scope="col">Seller</th><th scope="col">Status</th><th scope="col">In charge</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {shown.slice(0, listCount).map((l) => (
                  <tr key={l.id} style={{ cursor: 'default' }}>
                    <td className="max-w-[260px] !w-auto !pl-4"><span className="block truncate font-semibold">{l.title}</span></td>
                    <td className="ops-num">{naira(l.price_ngn)}</td>
                    <td className="whitespace-nowrap">{regionLabel(l.region)}</td>
                    <td className="max-w-[170px]"><span className="block truncate">{l.seller_name}</span><span className="ops-mute block truncate text-xs ops-tnum">{l.seller_phone}</span></td>
                    <td><Badge tone={listingTone(l.status)}>{listingLabel(l.status)}</Badge></td>
                    <td className="max-w-[150px] truncate">{chargeOf(l)}</td>
                    <td><ListingActions l={l} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ul className="xl:hidden">
          {shown.slice(0, listCount).map((l) => (
            <li key={l.id} className="ops-rowitem">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-semibold leading-5">{l.title}</p>
                <p className="ops-tnum flex-none text-[13px] font-semibold">{naira(l.price_ngn)}</p>
              </div>
              <p className="ops-mute text-xs">{regionLabel(l.region)} · Seller {l.seller_name} · <span className="ops-tnum">{l.seller_phone}</span></p>
              <p className="flex flex-wrap items-center gap-2 text-xs"><Badge tone={listingTone(l.status)}>{listingLabel(l.status)}</Badge><span>In charge: {chargeOf(l)}</span></p>
              <ListingActions l={l} />
            </li>
          ))}
        </ul>
        <div className="ops-tablefoot">
          <span className="ops-tnum">{Math.min(listCount, shown.length)} of {shown.length}</span>
          {shown.length > listCount && <button type="button" className="ops-btn ops-btn-sm" onClick={() => setListCount((n) => n + LISTING_STEP)}>Show more ({shown.length - listCount} left)</button>}
        </div>
      </Card>

      <Card id="g-audit" title={`Audit trail (${audit.length})`} label="Audit log">
        {audit.length === 0 ? <p className="ops-mute text-[13px]">Nothing yet.</p> : (
          <ol className="ops-timeline">
            {audit.slice(0, auditCount).map((a, i) => {
              const d = new Date(a.created_at);
              const day = d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
              const prev = i > 0 ? new Date(audit[i - 1].created_at).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }) : null;
              return (
                <li key={a.id}>
                  {day !== prev && <p className="ops-day">{day}</p>}
                  <div className="ops-tl">
                    <p className="ops-mute ops-tnum">{d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' })}</p>
                    <div>
                      <p><span className="font-semibold">{a.actor_id ? nameOf.get(a.actor_id) ?? 'An admin' : 'A seller'}</span> {actionText(a.action)}</p>
                      {auditReason(a.detail) && <p className="ops-mute">Reason: {auditReason(a.detail)}</p>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {audit.length > auditCount && <button type="button" className="ops-btn mt-3" onClick={() => setAuditCount((n) => n + AUDIT_STEP)}>Show older ({audit.length - auditCount} more)</button>}
      </Card>

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
      {toast && <Toast onClose={() => setToast(null)}>{toast}</Toast>}
    </Page>
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
      <p className="ops-mute text-[13px]">{help}</p>
      <label htmlFor="g-reason" className="ops-label">Reason</label>
      <textarea id="g-reason" className="ops-input min-h-24" rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
      {needsName && (
        <>
          <label htmlFor="g-confirm" className="ops-label">Type “{confirmName}” to confirm</label>
          <input id="g-confirm" className="ops-input" value={typed} autoComplete="off" onChange={(e) => { setTyped(e.target.value); setError(null); }} />
        </>
      )}
      {error && <p role="alert" className="text-[13px] text-[var(--p-crit-text)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="ops-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={`ops-btn ${danger ? 'ops-btn-red' : 'ops-btn-primary'}`} onClick={go} disabled={busy}>{busy ? 'Working…' : action}</button>
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
      {targets.length === 0 ? <p className="text-[13px] text-[var(--p-crit-text)]">No other active admin in this region.</p> : (
        <>
          <label htmlFor="g-to" className="ops-label">New admin in charge</label>
          <select id="g-to" className="ops-input" value={to} onChange={(e) => { setTo(e.target.value); setError(null); }}>
            <option value="">Choose…</option>
            {targets.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.phone} ({t.role === 'global_admin' ? 'Global' : regionLabel(t.region)})</option>)}
          </select>
          <label htmlFor="g-why" className="ops-label">Reason</label>
          <textarea id="g-why" className="ops-input min-h-24" rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
        </>
      )}
      {error && <p role="alert" className="text-[13px] text-[var(--p-crit-text)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="ops-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="ops-btn ops-btn-primary" onClick={go} disabled={busy || targets.length === 0}>{busy ? 'Working…' : 'Reassign'}</button>
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
      <label htmlFor="n-name" className="ops-label">Name</label>
      <input id="n-name" className="ops-input" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      <label htmlFor="n-phone" className="ops-label">Phone</label>
      <input id="n-phone" className="ops-input" type="tel" inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
      <label htmlFor="n-role" className="ops-label">Role</label>
      <select id="n-role" className="ops-input" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>
        <option value="regional_admin">Regional admin</option><option value="global_admin">Global admin</option>
      </select>
      {v.role === 'regional_admin' && (
        <>
          <label htmlFor="n-region" className="ops-label">Region</label>
          <select id="n-region" className="ops-input" value={v.region} onChange={(e) => setV({ ...v, region: e.target.value })}>
            {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </>
      )}
      {error && <p role="alert" className="text-[13px] text-[var(--p-crit-text)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="ops-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="ops-btn ops-btn-primary" onClick={go} disabled={busy}>{busy ? 'Adding…' : 'Add admin'}</button>
      </div>
    </Shell>
  );
}
