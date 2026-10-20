import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from './middleware';

const req = (url: string, cookie?: string) =>
  new NextRequest(url, { headers: cookie ? { cookie } : {} });

describe('middleware', () => {
  it('sets the obn_ref cookie for a valid code on /list', () => {
    const res = middleware(req('https://obn.example/list?ref=3fa9c1d2'));
    const c = res.cookies.get('obn_ref');
    expect(c?.value).toBe('3fa9c1d2');
    expect(c?.httpOnly).toBe(true);
    expect(c?.secure).toBe(true);
    expect(c?.sameSite).toBe('lax');
    expect(c?.maxAge).toBe(2592000);
    expect(c?.path).toBe('/');
  });

  it('sets it on the landing page too', () => {
    expect(middleware(req('https://obn.example/?ref=7c1e44ab')).cookies.get('obn_ref')?.value).toBe('7c1e44ab');
  });

  it('a newer valid code replaces the older one', () => {
    const res = middleware(req('https://obn.example/list?ref=aaaaaaaa', 'obn_ref=bbbbbbbb'));
    expect(res.cookies.get('obn_ref')?.value).toBe('aaaaaaaa');
  });

  it('ignores a bad code and leaves the old cookie alone', () => {
    const res = middleware(req('https://obn.example/list?ref=NOPE', 'obn_ref=bbbbbbbb'));
    expect(res.cookies.get('obn_ref')).toBeUndefined();
  });

  it('keeps the cookie when the sign-in pages are opened without a ref', () => {
    const res = middleware(req('https://obn.example/list', 'obn_ref=bbbbbbbb'));
    expect(res.cookies.get('obn_ref')).toBeUndefined();
    expect(res.status).toBe(200);
  });

  it('redirects a signed-out visitor from /admin/pool to /list with next', () => {
    const res = middleware(req('https://obn.example/admin/pool'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://obn.example/list?next=%2Fadmin%2Fpool');
  });

  it('redirects a signed-out visitor from the seller form to /list and still stores the code', () => {
    const res = middleware(req('https://obn.example/list/form?ref=3fa9c1d2'));
    expect(res.headers.get('location')).toBe('https://obn.example/list');
    expect(res.cookies.get('obn_ref')?.value).toBe('3fa9c1d2');
  });

  it('lets a visitor with a session cookie through', () => {
    const res = middleware(req('https://obn.example/admin/dashboard', 'sb-abcd-auth-token=x'));
    expect(res.status).toBe(200);
  });

  it('leaves the edit link page open', () => {
    expect(middleware(req('https://obn.example/list/edit?token=abc')).status).toBe(200);
  });

  it('adds security headers', () => {
    const res = middleware(req('https://obn.example/list'));
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });
});
