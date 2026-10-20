import { describe, expect, it } from 'vitest';
import type { FeedRow } from './inbox';
import { actionText, auditReason, canBlacklist, canReinstate, canRevoke, countsFor, eligibleTargets, filterListings, nameMatches, orphaned, statusOf, type AdminRow } from './overview';

const admin = (o: Partial<AdminRow>): AdminRow => ({ id: 'a', full_name: 'Tunde Bello', phone: '+234', role: 'regional_admin', region: 'delta', is_active: true, is_blacklisted: false, referral_code: 'abcdef01', status_reason: null, updated_at: 'T', ...o });
const row = (o: Partial<FeedRow>): FeedRow => ({ id: 'x', region: 'delta', category: 'tvs', title: 't', description: 'd', price_ngn: 1, condition_age: 'neatly_used', condition_work: 'working_perfectly', brand: null, model: null, size: null, photo_urls: [], video_url: null, status: 'approved', submitted_at: null, approved_at: null, assigned_admin_id: 'a', admin_in_charge_name: null, contact_visible: true, seller_name: 'A', seller_phone: '+234', ...o });

describe('admin status and permissions', () => {
  it('statusOf', () => {
    expect(statusOf(admin({}))).toBe('Active');
    expect(statusOf(admin({ is_active: false }))).toBe('Revoked');
    expect(statusOf(admin({ is_active: false, is_blacklisted: true }))).toBe('Blacklisted');
  });
  it('global admins and blacklisted admins cannot be actioned (GA-10)', () => {
    const g = admin({ role: 'global_admin', region: null });
    expect([canRevoke(g), canReinstate(g), canBlacklist(g)]).toEqual([false, false, false]);
    const b = admin({ is_active: false, is_blacklisted: true });
    expect([canRevoke(b), canReinstate(b), canBlacklist(b)]).toEqual([false, false, false]);
    expect([canRevoke(admin({})), canReinstate(admin({})), canBlacklist(admin({}))]).toEqual([true, false, true]);
    expect([canRevoke(admin({ is_active: false })), canReinstate(admin({ is_active: false })), canBlacklist(admin({ is_active: false }))]).toEqual([false, true, true]);
  });
  it('nameMatches ignores case and spacing but needs the full name', () => {
    expect(nameMatches('  tunde   BELLO ', 'Tunde Bello')).toBe(true);
    expect(nameMatches('Tunde', 'Tunde Bello')).toBe(false);
    expect(nameMatches('', '')).toBe(false);
  });
});

describe('listing helpers', () => {
  it('countsFor counts pending and approved in charge', () => {
    expect(countsFor('a', [row({}), row({ status: 'pending_review' }), row({ status: 'rejected' }), row({ assigned_admin_id: 'b' })])).toEqual({ pending: 1, approved: 1 });
  });
  it('orphaned lists approved listings of revoked or blacklisted admins only', () => {
    const admins = [admin({ id: 'a', is_active: false }), admin({ id: 'b' }), admin({ id: 'c', is_active: false, is_blacklisted: true })];
    const rows = [row({ id: '1', assigned_admin_id: 'a' }), row({ id: '2', assigned_admin_id: 'b' }), row({ id: '3', assigned_admin_id: 'c' }), row({ id: '4', assigned_admin_id: 'a', status: 'pending_review' }), row({ id: '5', assigned_admin_id: null })];
    expect(orphaned(rows, admins).map((r) => r.id)).toEqual(['1', '3']);
  });
  it('eligibleTargets: same region or global, active, not the current admin', () => {
    const admins = [admin({ id: 'a' }), admin({ id: 'b' }), admin({ id: 'c', region: 'ekiti' }), admin({ id: 'd', is_active: false }), admin({ id: 'g', role: 'global_admin', region: null }), admin({ id: 'e', is_blacklisted: true, is_active: false })];
    expect(eligibleTargets({ region: 'delta', assigned_admin_id: 'a' }, admins).map((x) => x.id)).toEqual(['b', 'g']);
  });
  it('filterListings', () => {
    const rows = [row({ id: '1' }), row({ id: '2', region: 'ekiti' }), row({ id: '3', status: 'pending_review', assigned_admin_id: null })];
    expect(filterListings(rows, { region: 'ekiti', status: '', admin: '' }).map((r) => r.id)).toEqual(['2']);
    expect(filterListings(rows, { region: '', status: 'pending_review', admin: 'none' }).map((r) => r.id)).toEqual(['3']);
    expect(filterListings(rows, { region: '', status: '', admin: 'a' }).map((r) => r.id)).toEqual(['1', '2']);
  });
  it('audit text', () => {
    expect(actionText('admin.blacklist')).toBe('blacklisted an admin');
    expect(actionText('weird')).toBe('weird');
    expect(auditReason({ reason: 'x' })).toBe('x');
    expect(auditReason({})).toBe('');
  });
});
