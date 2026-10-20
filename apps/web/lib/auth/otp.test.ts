import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { sendCode, verifyCode, type OtpDeps, type ProfileRow } from './otp';

function fakeDeps(over: Partial<OtpDeps> = {}) {
  const calls: string[] = [];
  const deps: OtpDeps = {
    isBlacklisted: async () => false,
    markSent: async () => void calls.push('markSent'),
    state: async () => ({ triesLeft: 5, expired: false }),
    registerWrong: async () => 4,
    clear: async () => void calls.push('clear'),
    signInWithOtp: async () => ({ error: null }),
    verifyOtp: async () => ({ userId: 'u1', error: null }),
    loadProfile: async (): Promise<ProfileRow> => ({ role: 'seller', region: null, fullName: 'Ada Obi', isActive: true, isBlacklisted: false }),
    signOut: async () => void calls.push('signOut'),
    ...over,
  };
  return { deps, calls };
}
const fails = async (p: Promise<unknown>) => (await p.catch((e) => e)) as ApiError;

describe('sendCode', () => {
  it('normalises the number, sends and starts the clock', async () => {
    const { deps, calls } = fakeDeps();
    const out = await sendCode(deps, '0803 123 4567');
    expect(out).toEqual({ sent: true, phone: '+2348031234567', resend_after_seconds: 60, expires_in_seconds: 600 });
    expect(calls).toEqual(['markSent']);
  });
  it('rejects a number that is not Nigerian', async () => {
    const err = await fails(sendCode(fakeDeps().deps, '+14155550123'));
    expect(err.code).toBe('invalid_phone');
    expect(err.details).toEqual({ field: 'phone' });
  });
  it('refuses a blacklisted number before sending anything', async () => {
    let sent = false;
    const { deps } = fakeDeps({ isBlacklisted: async () => true, signInWithOtp: async () => { sent = true; return { error: null }; } });
    expect((await fails(sendCode(deps, '08031234567'))).code).toBe('phone_blocked');
    expect(sent).toBe(false);
  });
  it('maps a provider rate limit to rate_limited with 60 seconds', async () => {
    const { deps } = fakeDeps({ signInWithOtp: async () => ({ error: { status: 429, code: 'over_sms_send_rate_limit' } }) });
    const err = await fails(sendCode(deps, '08031234567'));
    expect(err.code).toBe('rate_limited');
    expect(err.details).toEqual({ retry_after_seconds: 60 });
  });
  it('maps any other provider failure to whatsapp_unavailable and does not start the clock', async () => {
    const { deps, calls } = fakeDeps({ signInWithOtp: async () => ({ error: { status: 500, code: 'hook_failed' } }) });
    expect((await fails(sendCode(deps, '08031234567'))).code).toBe('whatsapp_unavailable');
    expect(calls).toEqual([]);
  });
});

describe('verifyCode', () => {
  it('signs a seller in and sends them to the form', async () => {
    const { deps, calls } = fakeDeps();
    const out = await verifyCode(deps, '08031234567', '481923');
    expect(out).toEqual({ user: { id: 'u1', role: 'seller', region: null, needs_name: false }, next: '/list/form' });
    expect(calls).toEqual(['clear']);
  });
  it('flags a seller without a name', async () => {
    const { deps } = fakeDeps({ loadProfile: async () => ({ role: 'seller', region: null, fullName: '', isActive: true, isBlacklisted: false }) });
    expect((await verifyCode(deps, '08031234567', '481923')).user.needs_name).toBe(true);
  });
  it('sends an admin to the dashboard, or to a safe next page', async () => {
    const admin: ProfileRow = { role: 'regional_admin', region: 'ekiti', fullName: 'Tunde', isActive: true, isBlacklisted: false };
    const { deps } = fakeDeps({ loadProfile: async () => admin });
    expect((await verifyCode(deps, '08031234567', '1')).next).toBe('/admin/dashboard');
    expect((await verifyCode(deps, '08031234567', '1', '/admin/pool')).next).toBe('/admin/pool');
    expect((await verifyCode(deps, '08031234567', '1', 'https://evil.example')).next).toBe('/admin/dashboard');
  });
  it('ignores next for sellers', async () => {
    expect((await verifyCode(fakeDeps().deps, '08031234567', '1', '/admin/pool')).next).toBe('/list/form');
  });
  it('wrong code: says how many tries are left', async () => {
    const { deps } = fakeDeps({ verifyOtp: async () => ({ userId: null, error: { code: 'otp_expired' } }), registerWrong: async () => 4 });
    const err = await fails(verifyCode(deps, '08031234567', '000000'));
    expect(err.code).toBe('invalid_code');
    expect(err.message).toBe('That code is not right. 4 tries left.');
    expect(err.details).toEqual({ tries_left: 4 });
  });
  it('uses the singular for the last try', async () => {
    const { deps } = fakeDeps({ verifyOtp: async () => ({ userId: null, error: { code: 'x' } }), registerWrong: async () => 1 });
    expect((await fails(verifyCode(deps, '08031234567', '0'))).message).toBe('That code is not right. 1 try left.');
  });
  it('fifth wrong code voids the code', async () => {
    const { deps } = fakeDeps({ verifyOtp: async () => ({ userId: null, error: { code: 'x' } }), registerWrong: async () => 0 });
    expect((await fails(verifyCode(deps, '08031234567', '0'))).code).toBe('too_many_attempts');
  });
  it('does not even try a void code', async () => {
    let tried = false;
    const { deps } = fakeDeps({ state: async () => ({ triesLeft: 0, expired: false }), verifyOtp: async () => { tried = true; return { userId: 'u', error: null }; } });
    expect((await fails(verifyCode(deps, '08031234567', '481923'))).code).toBe('too_many_attempts');
    expect(tried).toBe(false);
  });
  it('an expired code says so', async () => {
    const { deps } = fakeDeps({ state: async () => ({ triesLeft: 5, expired: true }) });
    expect((await fails(verifyCode(deps, '08031234567', '481923'))).code).toBe('code_expired');
  });
  it('a blacklisted profile is signed out and refused', async () => {
    const { deps, calls } = fakeDeps({ loadProfile: async () => ({ role: 'regional_admin', region: 'delta', fullName: 'X', isActive: false, isBlacklisted: true }) });
    expect((await fails(verifyCode(deps, '08031234567', '1'))).code).toBe('phone_blocked');
    expect(calls).toEqual(['signOut']);
  });
  it('a revoked admin is signed out and refused', async () => {
    const { deps, calls } = fakeDeps({ loadProfile: async () => ({ role: 'regional_admin', region: 'delta', fullName: 'X', isActive: false, isBlacklisted: false }) });
    expect((await fails(verifyCode(deps, '08031234567', '1'))).code).toBe('account_blocked');
    expect(calls).toEqual(['signOut']);
  });
  it('a missing profile signs out and reports an internal error', async () => {
    const { deps, calls } = fakeDeps({ loadProfile: async () => null });
    expect((await fails(verifyCode(deps, '08031234567', '1'))).code).toBe('internal_error');
    expect(calls).toEqual(['signOut']);
  });
});
