import { describe, expect, it } from 'vitest';
import { badgeOf, naira, referralLink, splitTabs, waitingFor, whatsappShareUrl, type FeedRow } from './inbox';

const row = (o: Partial<FeedRow>): FeedRow => ({
  id: 'x', region: 'delta', category: 'tvs', title: 't', description: 'd', price_ngn: 1000, condition_age: 'neatly_used', condition_work: 'working_perfectly',
  brand: null, model: null, size: null, photo_urls: [], video_url: null, status: 'pending_review', submitted_at: '2026-10-20T10:00:00Z', approved_at: null,
  assigned_admin_id: null, admin_in_charge_name: null, contact_visible: false, seller_name: 'A***', seller_phone: '+234 ••• ••• ••67', ...o,
});

describe('splitTabs', () => {
  it('puts pending in review, my rejected in waiting, my approved in done', () => {
    const t = splitTabs([row({ id: '1' }), row({ id: '2', status: 'rejected', assigned_admin_id: 'me' }), row({ id: '3', status: 'approved', assigned_admin_id: 'me' })], 'me', false);
    expect(t.review.map((r) => r.id)).toEqual(['1']);
    expect(t.waiting.map((r) => r.id)).toEqual(['2']);
    expect(t.done.map((r) => r.id)).toEqual(['3']);
  });
  it('hides other admins rejected and approved listings from a regional admin, shows all to global', () => {
    const rows = [row({ id: '2', status: 'rejected', assigned_admin_id: 'other' }), row({ id: '3', status: 'approved', assigned_admin_id: 'other' })];
    expect(splitTabs(rows, 'me', false)).toEqual({ review: [], waiting: [], done: [] });
    const g = splitTabs(rows, 'me', true);
    expect(g.waiting).toHaveLength(1);
    expect(g.done).toHaveLength(1);
  });
  it('sorts review oldest first and done newest first', () => {
    const t = splitTabs(
      [row({ id: 'new', submitted_at: '2026-10-20T12:00:00Z' }), row({ id: 'old', submitted_at: '2026-10-20T08:00:00Z' }),
       row({ id: 'a', status: 'approved', assigned_admin_id: 'me', approved_at: '2026-10-19T00:00:00Z' }),
       row({ id: 'b', status: 'approved', assigned_admin_id: 'me', approved_at: '2026-10-20T00:00:00Z' })], 'me', false);
    expect(t.review.map((r) => r.id)).toEqual(['old', 'new']);
    expect(t.done.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('helpers', () => {
  const now = Date.parse('2026-10-20T13:00:00Z');
  it('waitingFor', () => {
    expect(waitingFor('2026-10-20T12:59:50Z', now)).toBe('1m');
    expect(waitingFor('2026-10-20T12:15:00Z', now)).toBe('45m');
    expect(waitingFor('2026-10-20T10:00:00Z', now)).toBe('3h');
    expect(waitingFor('2026-10-17T13:00:00Z', now)).toBe('3d');
    expect(waitingFor(null, now)).toBe('');
  });
  it('badgeOf', () => {
    expect(badgeOf(row({}), 'me')).toBe('Unclaimed');
    expect(badgeOf(row({ assigned_admin_id: 'me' }), 'me')).toBe('Assigned to you');
    expect(badgeOf(row({ assigned_admin_id: 'o' }), 'me')).toBe('Assigned');
  });
  it('referral link and share url', () => {
    expect(referralLink('https://obn.example/', 'abcdef01')).toBe('https://obn.example/list?ref=abcdef01');
    expect(whatsappShareUrl('https://obn.example/list?ref=abcdef01')).toContain('https://wa.me/?text=');
  });
  it('naira', () => expect(naira('150000.00')).toBe('₦150,000'));
});
