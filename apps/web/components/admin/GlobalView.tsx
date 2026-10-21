'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, ScrollText, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/auth/client';
import { naira, referralLink, type FeedRow } from '@/lib/admin/inbox';
import {
  actionText, auditReason, canBlacklist, canReinstate, canRevoke, countsFor, eligibleTargets, filterListings, nameMatches, orphaned, statusOf,
  type AdminRow, type AuditRow,
} from '@/lib/admin/overview';
import { validateReason } from '@/lib/admin/reasons';
import { REGIONS } from '@/lib/listing/schema';
import { Badge, Dialog, Notice, PageTitle, regionLabelOf, StatCard, type Tone } from './ui';

const regionLabel = regionLabelOf;
type Tab = 'admins' | 'listings' | 'audit';
type Dialog =
  | { kind: 'revoke' | 'blacklist'; admin: AdminRow }
  | { kind: 'reassign'; listing: FeedRow }
  | { kind: 'add' }
  | null;

export function GlobalView({ siteUrl, admins, listings, audit }: {
  siteUrl: string; admins: AdminRow[]; listings: FeedRow[]; audit: AuditRow[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('admins');
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
  const TABS_G = [
    { id: 'admins' as const, label: 'Admins', Icon: Users, n: admins.length },
    { id: 'listings' as const, label: 'Listings', Icon: ClipboardList, n: listings.length },
    { id: 'audit' as const, label: 'Audit', Icon: ScrollText, n: audit.length },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Global console" sub="Admins, every listing, and the audit trail across all regions.">
        <button type="button" className="ops-btn ops-btn-red" onClick={() => setDialog({ kind: 'add' })}><UserPlus size={18} aria-hidden="true" />Add admin</button>
      </PageTitle>

      <section aria-label="Platform at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Active admins" value={active} tone="green" hint={`${admins.length} in total`} />
        <StatCard label="Waiting review" value={pendingAll} tone="red" />
        <StatCard label="Approved" value={approvedAll} tone="blue" />
        <StatCard label="Listings loaded" value={listings.length} tone="amber" hint="Latest 300" />
        <StatCard label="Needs an admin" value={orphans.length} tone={orphans.length ? 'red' : 'green'} hint={orphans.length ? 'Reassign below' : 'All covered'} />
      </section>

      {message && <Notice kind={message.ok ? 'ok' : 'error'}>{message.text}</Notice>}

      <div role="tablist" aria-label="Global sections" className="grid grid-cols-3 gap-1 rounded-2xl border border-[#232C3D] bg-[#0E1219] p-1 sm:max-w-xl">
        {TABS_G.map(({ id, label, Icon, n }) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition-colors ${tab === id ? 'bg-[#1F293C] text-white shadow' : 'ops-mute hover:text-white'}`}>
            <Icon size={16} aria-hidden="true" />{label} <span className={tab === id ? 'text-[#64B5F6]' : ''}>({n})</span>
          </button>
        ))}
      </div>

      {tab === 'admins' && (
        <section aria-label="Admins">
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {admins.map((a) => {
              const c = countsFor(a.id, listings);
              const st = statusOf(a);
              return (
                <li key={a.id} className="ops-card flex flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-brand-blue text-base font-extrabold" aria-hidden="true">{initials(a.full_name || a.phone)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display truncate text-lg font-extrabold tracking-tight">{a.full_name || 'No name yet'}</p>
                      <p className="ops-mute text-sm">{a.phone}</p>
                    </div>
                    <Badge tone={statusTone(st)}>{st}</Badge>
                  </div>
                  <p className="flex flex-wrap gap-1.5">
                    <span className="ops-chip">{a.role === 'global_admin' ? 'Global' : regionLabel(a.region)}</span>
                    <span className="ops-chip">{c.pending} pending</span>
                    <span className="ops-chip">{c.approved} approved</span>
                  </p>
                  {a.referral_code && <p className="ops-mute break-all text-xs">{referralLink(siteUrl, a.referral_code)}</p>}
                  <p className="ops-mute text-xs">Last change {new Date(a.updated_at).toLocaleDateString('en-NG')}</p>
                  {a.status_reason && <p className="ops-card2 p-3 text-sm">Reason: {a.status_reason}</p>}
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
            {admins.length === 0 && <li className="ops-card col-span-full py-12 text-center ops-mute">No admins yet. Add the first one.</li>}
          </ul>
        </section>
      )}

      {tab === 'listings' && (
        <section className="flex flex-col gap-4" aria-label="Listings">
          {orphans.length > 0 && (
            <div className="ops-card border-[#D32F2F]/60 p-4">
              <h2 className="font-display flex items-center gap-2 text-lg font-extrabold text-[#FF8A80]"><ShieldAlert size={20} aria-hidden="true" />Needs a new admin in charge ({orphans.length})</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {orphans.map((l) => (
                  <li key={l.id} className="ops-card2 flex items-center justify-between gap-3 p-3">
                    <span className="min-w-0 truncate text-sm">{l.title} · {regionLabel(l.region)}</span>
                    <button type="button" className="ops-btn" onClick={() => setDialog({ kind: 'reassign', listing: l })}>Reassign</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-2 md:grid-cols-3">
            <label className="sr-only" htmlFor="f-region">Region</label>
            <select id="f-region" className="ops-input" value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })}>
              <option value="">All regions</option>{REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <label className="sr-only" htmlFor="f-status">Status</label>
            <select id="f-status" className="ops-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Any status</option><option value="pending_review">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
            </select>
            <label className="sr-only" htmlFor="f-admin">Admin in charge</label>
            <select id="f-admin" className="ops-input" value={filters.admin} onChange={(e) => setFilters({ ...filters, admin: e.target.value })}>
              <option value="">Any admin</option><option value="none">Unassigned</option>{admins.map((a) => <option key={a.id} value={a.id}>{a.full_name || a.phone}</option>)}
            </select>
          </div>
          {shown.length === 0 && <p className="ops-card py-10 text-center ops-mute">No listings match.</p>}
          <ul className="grid gap-3 lg:grid-cols-2">
            {shown.map((l) => (
              <li key={l.id} className="ops-card flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-lg font-extrabold leading-tight tracking-tight">{l.title}</p>
                  <Badge tone={l.status === 'approved' ? 'green' : l.status === 'rejected' ? 'red' : 'amber'}>{l.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-sm"><span className="font-semibold text-[#66BB6A]">{naira(l.price_ngn)}</span> · {regionLabel(l.region)}</p>
                <p className="ops-mute text-sm">Seller: {l.seller_name} · {l.seller_phone}</p>
                <p className="ops-mute text-sm">In charge: {l.assigned_admin_id ? nameOf.get(l.assigned_admin_id) ?? l.admin_in_charge_name ?? 'Unknown' : 'Nobody yet'}</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" className="ops-btn" onClick={() => setDialog({ kind: 'reassign', listing: l })}>Reassign</button>
                  {l.status === 'pending_review' && <a className="ops-btn" href="/admin/dashboard">Review</a>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'audit' && (
        <section aria-label="Audit log" className="ops-card p-5">
          <ol className="relative flex flex-col gap-4 border-l border-[#232C3D] pl-6">
            {audit.map((a) => (
              <li key={a.id} className="relative text-sm">
                <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-[#0A0D13] bg-brand-blue" aria-hidden="true" />
                <p><span className="font-semibold">{a.actor_id ? nameOf.get(a.actor_id) ?? 'An admin' : 'A seller'}</span> {actionText(a.action)}</p>
                {auditReason(a.detail) && <p className="ops-mute">Reason: {auditReason(a.detail)}</p>}
                <p className="ops-mute text-xs">{new Date(a.created_at).toLocaleString('en-NG')}</p>
              </li>
            ))}
            {audit.length === 0 && <li className="ops-mute py-6 text-sm">Nothing yet.</li>}
          </ol>
        </section>
      )}

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
    </div>
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
      <label htmlFor="g-reason" className="text-[15px] font-semibold">Reason</label>
      <textarea id="g-reason" className="ops-input min-h-24" rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
      {needsName && (
        <>
          <label htmlFor="g-confirm" className="text-[15px] font-semibold">Type “{confirmName}” to confirm</label>
          <input id="g-confirm" className="ops-input" value={typed} autoComplete="off" onChange={(e) => { setTyped(e.target.value); setError(null); }} />
        </>
      )}
      {error && <p role="alert" className="text-sm text-[#FF8A80]">{error}</p>}
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
      {targets.length === 0 ? <p className="text-[#FF8A80]">No other active admin in this region.</p> : (
        <>
          <label htmlFor="g-to" className="text-[15px] font-semibold">New admin in charge</label>
          <select id="g-to" className="ops-input" value={to} onChange={(e) => { setTo(e.target.value); setError(null); }}>
            <option value="">Choose…</option>
            {targets.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.phone} ({t.role === 'global_admin' ? 'Global' : regionLabel(t.region)})</option>)}
          </select>
          <label htmlFor="g-why" className="text-[15px] font-semibold">Reason</label>
          <textarea id="g-why" className="ops-input min-h-24" rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
        </>
      )}
      {error && <p role="alert" className="text-sm text-[#FF8A80]">{error}</p>}
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
      <label htmlFor="n-name" className="text-[15px] font-semibold">Name</label>
      <input id="n-name" className="ops-input" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      <label htmlFor="n-phone" className="text-[15px] font-semibold">Phone</label>
      <input id="n-phone" className="ops-input" type="tel" inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
      <label htmlFor="n-role" className="text-[15px] font-semibold">Role</label>
      <select id="n-role" className="ops-input" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>
        <option value="regional_admin">Regional admin</option><option value="global_admin">Global admin</option>
      </select>
      {v.role === 'regional_admin' && (
        <>
          <label htmlFor="n-region" className="text-[15px] font-semibold">Region</label>
          <select id="n-region" className="ops-input" value={v.region} onChange={(e) => setV({ ...v, region: e.target.value })}>
            {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </>
      )}
      {error && <p role="alert" className="text-sm text-[#FF8A80]">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="ops-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="ops-btn ops-btn-red" onClick={go} disabled={busy}>{busy ? 'Adding…' : 'Add admin'}</button>
      </div>
    </Shell>
  );
}
