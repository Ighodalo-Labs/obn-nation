'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '@/lib/auth/client';
import { naira, referralLink, type FeedRow } from '@/lib/admin/inbox';
import {
  actionText, auditReason, canBlacklist, canReinstate, canRevoke, countsFor, eligibleTargets, filterListings, nameMatches, orphaned, statusOf,
  type AdminRow, type AuditRow,
} from '@/lib/admin/overview';
import { validateReason } from '@/lib/admin/reasons';
import { REGIONS } from '@/lib/listing/schema';
import { inputClass, primaryButton, secondaryButton } from '../listing/ui';

const regionLabel = (v: string | null) => REGIONS.find((r) => r.value === v)?.label ?? '';
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

  return (
    <div className="flex flex-col gap-4 py-4 pb-10">
      <h1 className="text-2xl">Global</h1>
      {message && <p role={message.ok ? 'status' : 'alert'} className={`rounded-lg border bg-surface p-3 ${message.ok ? 'border-border text-tint-green' : 'border-tint-red text-tint-red'}`}>{message.text}</p>}

      <div role="tablist" aria-label="Global sections" className="grid grid-cols-3 gap-1">
        {(['admins', 'listings', 'audit'] as const).map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`min-h-12 rounded-lg px-1 text-sm ${tab === t ? 'bg-surface text-white ring-1 ring-border' : 'text-muted'}`}>
            {t === 'admins' ? 'Admins' : t === 'listings' ? 'Listings' : 'Audit'}
          </button>
        ))}
      </div>

      {tab === 'admins' && (
        <section className="flex flex-col gap-3" aria-label="Admins">
          <button type="button" className={primaryButton} onClick={() => setDialog({ kind: 'add' })}>Add admin</button>
          <ul className="flex flex-col gap-3">
            {admins.map((a) => {
              const c = countsFor(a.id, listings);
              const st = statusOf(a);
              return (
                <li key={a.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-base font-semibold">{a.full_name || 'No name yet'}</span>
                    <span className={`text-sm ${st === 'Active' ? 'text-tint-green' : 'text-tint-red'}`}>{st}</span>
                  </p>
                  <p className="text-sm text-muted">{a.phone} · {a.role === 'global_admin' ? 'Global' : regionLabel(a.region)}</p>
                  {a.referral_code && <p className="break-all text-sm text-muted">{referralLink(siteUrl, a.referral_code)}</p>}
                  <p className="text-sm text-muted">{c.pending} pending · {c.approved} approved in charge · last change {new Date(a.updated_at).toLocaleDateString('en-NG')}</p>
                  {a.status_reason && <p className="text-sm">Reason: {a.status_reason}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    {canRevoke(a) && <button type="button" className={secondaryButton} onClick={() => setDialog({ kind: 'revoke', admin: a })}>Revoke</button>}
                    {canReinstate(a) && <button type="button" className={secondaryButton} onClick={() => run('/api/admin/status', { action: 'reinstate', profile_id: a.id }, 'Admin reinstated.')}>Reinstate</button>}
                    {canBlacklist(a) && <button type="button" className={`${secondaryButton} text-tint-red`} onClick={() => setDialog({ kind: 'blacklist', admin: a })}>Blacklist</button>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === 'listings' && (
        <section className="flex flex-col gap-3" aria-label="Listings">
          {orphans.length > 0 && (
            <div className="rounded-lg border border-tint-red bg-surface p-3">
              <h2 className="text-base text-tint-red">Needs a new admin in charge ({orphans.length})</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {orphans.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm">{l.title} · {regionLabel(l.region)}</span>
                    <button type="button" className={secondaryButton} onClick={() => setDialog({ kind: 'reassign', listing: l })}>Reassign</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <label className="sr-only" htmlFor="f-region">Region</label>
            <select id="f-region" className={inputClass} value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })}>
              <option value="">Region</option>{REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <label className="sr-only" htmlFor="f-status">Status</label>
            <select id="f-status" className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">Status</option><option value="pending_review">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
            </select>
            <label className="sr-only" htmlFor="f-admin">Admin in charge</label>
            <select id="f-admin" className={inputClass} value={filters.admin} onChange={(e) => setFilters({ ...filters, admin: e.target.value })}>
              <option value="">Admin</option><option value="none">Unassigned</option>{admins.map((a) => <option key={a.id} value={a.id}>{a.full_name || a.phone}</option>)}
            </select>
          </div>
          {shown.length === 0 && <p className="py-6 text-center text-muted">No listings match.</p>}
          <ul className="flex flex-col gap-3">
            {shown.map((l) => (
              <li key={l.id} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
                <p className="text-base font-semibold">{l.title}</p>
                <p className="text-sm">{naira(l.price_ngn)} · {regionLabel(l.region)} · {l.status.replace('_', ' ')}</p>
                <p className="text-sm text-muted">Seller: {l.seller_name} · {l.seller_phone}</p>
                <p className="text-sm text-muted">In charge: {l.assigned_admin_id ? nameOf.get(l.assigned_admin_id) ?? l.admin_in_charge_name ?? 'Unknown' : 'Nobody yet'}</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" className={secondaryButton} onClick={() => setDialog({ kind: 'reassign', listing: l })}>Reassign</button>
                  {l.status === 'pending_review' && <a className={`${secondaryButton} flex items-center justify-center`} href="/admin/dashboard">Review</a>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'audit' && (
        <section aria-label="Audit log">
          <ul className="flex flex-col gap-2">
            {audit.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
                <p><span className="font-semibold">{a.actor_id ? nameOf.get(a.actor_id) ?? 'An admin' : 'A seller'}</span> {actionText(a.action)}</p>
                {auditReason(a.detail) && <p className="text-muted">Reason: {auditReason(a.detail)}</p>}
                <p className="text-muted">{new Date(a.created_at).toLocaleString('en-NG')}</p>
              </li>
            ))}
            {audit.length === 0 && <li className="py-6 text-center text-muted">Nothing yet.</li>}
          </ul>
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
          action="Blacklist for good" onCancel={() => setDialog(null)}
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
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}>
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-t-2xl border border-border bg-bg p-4 sm:rounded-2xl">
        <h2 className="text-xl">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ReasonDialog({ title, help, action, confirmName, onCancel, onDone }: {
  title: string; help: string; action: string; confirmName?: string; onCancel: () => void; onDone: (reason: string) => Promise<boolean>;
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
      <p className="text-sm text-muted">{help}</p>
      <label htmlFor="g-reason" className="text-base">Reason</label>
      <textarea id="g-reason" className={`${inputClass} min-h-24`} rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
      {needsName && (
        <>
          <label htmlFor="g-confirm" className="text-base">Type “{confirmName}” to confirm</label>
          <input id="g-confirm" className={inputClass} value={typed} autoComplete="off" onChange={(e) => { setTyped(e.target.value); setError(null); }} />
        </>
      )}
      {error && <p role="alert" className="text-sm text-tint-red">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={secondaryButton} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={primaryButton} onClick={go} disabled={busy}>{busy ? 'Working…' : action}</button>
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
      {targets.length === 0 ? <p className="text-tint-red">No other active admin in this region.</p> : (
        <>
          <label htmlFor="g-to" className="text-base">New admin in charge</label>
          <select id="g-to" className={inputClass} value={to} onChange={(e) => { setTo(e.target.value); setError(null); }}>
            <option value="">Choose…</option>
            {targets.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.phone} ({t.role === 'global_admin' ? 'Global' : regionLabel(t.region)})</option>)}
          </select>
          <label htmlFor="g-why" className="text-base">Reason</label>
          <textarea id="g-why" className={`${inputClass} min-h-24`} rows={3} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} />
        </>
      )}
      {error && <p role="alert" className="text-sm text-tint-red">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={secondaryButton} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={primaryButton} onClick={go} disabled={busy || targets.length === 0}>{busy ? 'Working…' : 'Reassign'}</button>
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
      <label htmlFor="n-name" className="text-base">Name</label>
      <input id="n-name" className={inputClass} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      <label htmlFor="n-phone" className="text-base">Phone</label>
      <input id="n-phone" className={inputClass} type="tel" inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
      <label htmlFor="n-role" className="text-base">Role</label>
      <select id="n-role" className={inputClass} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>
        <option value="regional_admin">Regional admin</option><option value="global_admin">Global admin</option>
      </select>
      {v.role === 'regional_admin' && (
        <>
          <label htmlFor="n-region" className="text-base">Region</label>
          <select id="n-region" className={inputClass} value={v.region} onChange={(e) => setV({ ...v, region: e.target.value })}>
            {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </>
      )}
      {error && <p role="alert" className="text-sm text-tint-red">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={secondaryButton} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className={primaryButton} onClick={go} disabled={busy}>{busy ? 'Adding…' : 'Add admin'}</button>
      </div>
    </Shell>
  );
}
