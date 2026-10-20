import type { FeedRow } from './inbox';

/** Pure helpers for the Global Admin screen (PRD 6.7). */

export interface AdminRow {
  id: string;
  full_name: string;
  phone: string;
  role: 'regional_admin' | 'global_admin';
  region: string | null;
  is_active: boolean;
  is_blacklisted: boolean;
  referral_code: string | null;
  status_reason: string | null;
  updated_at: string;
}

export type AdminStatus = 'Active' | 'Revoked' | 'Blacklisted';
export const statusOf = (a: Pick<AdminRow, 'is_active' | 'is_blacklisted'>): AdminStatus =>
  a.is_blacklisted ? 'Blacklisted' : a.is_active ? 'Active' : 'Revoked';

/** GA-10: a Global Admin cannot be revoked or blacklisted from this screen, and nobody can touch a blacklisted admin. */
export function canRevoke(a: AdminRow): boolean { return a.role === 'regional_admin' && a.is_active && !a.is_blacklisted; }
export function canReinstate(a: AdminRow): boolean { return a.role === 'regional_admin' && !a.is_active && !a.is_blacklisted; }
export function canBlacklist(a: AdminRow): boolean { return a.role === 'regional_admin' && !a.is_blacklisted; }

/** GA-4: the typed confirmation must match the admin's name, ignoring case and extra spaces. */
export function nameMatches(typed: string, name: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  return norm(name).length > 0 && norm(typed) === norm(name);
}

export function countsFor(adminId: string, rows: FeedRow[]): { pending: number; approved: number } {
  let pending = 0, approved = 0;
  for (const r of rows) {
    if (r.assigned_admin_id !== adminId) continue;
    if (r.status === 'pending_review') pending++;
    if (r.status === 'approved') approved++;
  }
  return { pending, approved };
}

/** GA-8: approved listings whose admin in charge is revoked or blacklisted. */
export function orphaned(rows: FeedRow[], admins: AdminRow[]): FeedRow[] {
  const gone = new Set(admins.filter((a) => !a.is_active || a.is_blacklisted).map((a) => a.id));
  return rows.filter((r) => r.status === 'approved' && r.assigned_admin_id !== null && gone.has(r.assigned_admin_id));
}

/** GA-6: active admins of the listing's region, or any active Global Admin, except the current one. */
export function eligibleTargets(row: Pick<FeedRow, 'region' | 'assigned_admin_id'>, admins: AdminRow[]): AdminRow[] {
  return admins.filter(
    (a) => a.is_active && !a.is_blacklisted && a.id !== row.assigned_admin_id && (a.role === 'global_admin' || a.region === row.region),
  );
}

export interface ListingFilters { region: string; status: string; admin: string }
export function filterListings(rows: FeedRow[], f: ListingFilters): FeedRow[] {
  return rows.filter(
    (r) =>
      (!f.region || r.region === f.region) &&
      (!f.status || r.status === f.status) &&
      (!f.admin || (f.admin === 'none' ? r.assigned_admin_id === null : r.assigned_admin_id === f.admin)),
  );
}

export interface AuditRow { id: number; actor_id: string | null; action: string; detail: Record<string, unknown>; created_at: string }
const ACTIONS: Record<string, string> = {
  'listing.claim': 'claimed a listing', 'listing.approve': 'approved a listing', 'listing.reject': 'rejected a listing',
  'listing.reissue_link': 'sent a new edit link', 'listing.resubmit': 'seller resubmitted', 'listing.reassign': 'reassigned a listing',
  'admin.promote': 'added an admin', 'admin.revoke': 'revoked an admin', 'admin.reinstate': 'reinstated an admin', 'admin.blacklist': 'blacklisted an admin',
};
export const actionText = (action: string) => ACTIONS[action] ?? action;
export const auditReason = (d: Record<string, unknown>) => (typeof d.reason === 'string' ? d.reason : '');
