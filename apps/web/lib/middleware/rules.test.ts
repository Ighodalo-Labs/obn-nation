import { describe, expect, it } from 'vitest';
import { hasSessionCookie, needsSession, readsRef, referrerPolicyFor, safeNext, signInRedirect, validRef } from './rules';

describe('referral code shape (SI-6)', () => {
  it('accepts 8 lowercase hex characters', () => {
    expect(validRef('3fa9c1d2')).toBe('3fa9c1d2');
  });
  it.each(['', '3FA9C1D2', '3fa9c1d', '3fa9c1d2a', '3fa9c1dg', '<script>', '3fa9c1d2\n'])('rejects %j', (v) => {
    expect(validRef(v)).toBeNull();
  });
  it('rejects null and undefined', () => {
    expect(validRef(null)).toBeNull();
    expect(validRef(undefined)).toBeNull();
  });
});

describe('where ref is read', () => {
  it.each(['/', '/list', '/list/form', '/list/edit'])('reads on %s', (p) => expect(readsRef(p)).toBe(true));
  it.each(['/admin/dashboard', '/api/auth/otp/send', '/listing'])('ignores on %s', (p) => expect(readsRef(p)).toBe(false));
});

describe('route guards', () => {
  it.each(['/admin', '/admin/dashboard', '/admin/pool', '/admin/global', '/list/form'])('%s needs a session', (p) => {
    expect(needsSession(p)).toBe(true);
  });
  it.each(['/', '/list', '/list/edit', '/api/auth/otp/send'])('%s is open', (p) => {
    expect(needsSession(p)).toBe(false);
  });
  it('admin pages redirect to /list with next', () => {
    expect(signInRedirect('/admin/pool', '?region=ekiti')).toBe('/list?next=%2Fadmin%2Fpool%3Fregion%3Dekiti');
  });
  it('the seller form redirects to plain /list', () => {
    expect(signInRedirect('/list/form', '')).toBe('/list');
  });
});

describe('safeNext blocks open redirects', () => {
  it('allows admin paths', () => {
    expect(safeNext('/admin/dashboard')).toBe('/admin/dashboard');
    expect(safeNext('/admin')).toBe('/admin');
    expect(safeNext('/admin/pool?region=delta')).toBe('/admin/pool?region=delta');
  });
  it.each(['https://evil.example', '//evil.example', '/\\evil', '/adminx', '/list/form', '', '/admin/x\nSet-Cookie: a=b', null])(
    'rejects %j',
    (v) => expect(safeNext(v as string | null)).toBeNull(),
  );
});

describe('session cookie detection', () => {
  it('finds plain and chunked Supabase cookies', () => {
    expect(hasSessionCookie(['sb-abcd-auth-token'])).toBe(true);
    expect(hasSessionCookie(['x', 'sb-abcd-auth-token.0'])).toBe(true);
  });
  it('ignores other cookies', () => {
    expect(hasSessionCookie(['obn_ref', 'sb-abcd-auth-token-code-verifier'])).toBe(false);
  });
});

describe('edit page referrer policy (ED-10)', () => {
  it('sends no referrer from the edit page only', () => {
    expect(referrerPolicyFor('/list/edit')).toBe('no-referrer');
    expect(referrerPolicyFor('/list/edit/anything')).toBe('no-referrer');
    expect(referrerPolicyFor('/list')).toBeNull();
    expect(referrerPolicyFor('/list/editor')).toBeNull();
  });
});
