import { describe, expect, it, vi } from 'vitest';
import { BAN_WARNING, blacklistAdmin, blacklistSchema, createAdmin, createAdminSchema, reassignListing, reassignSchema, setStatus, statusSchema, type GlobalDeps } from './global';

const P = 'a0000000-0000-4000-8000-000000000004';
const G = 'a0000000-0000-4000-8000-000000000001';
const L = 'c1111111-1111-4111-8111-111111111111';
function deps(over: Partial<GlobalDeps> = {}): GlobalDeps {
  return {
    findProfileByPhone: vi.fn(async () => null),
    createLogin: vi.fn(async () => P),
    setName: vi.fn(async () => {}),
    promote: vi.fn(async () => ({ code: '7c1e44ab', error: null })),
    revoke: vi.fn(async () => null),
    reinstate: vi.fn(async () => null),
    reassign: vi.fn(async () => null),
    blacklist: vi.fn(async () => null),
    banLogin: vi.fn(async () => true),
    ...over,
  };
}
const body = (o = {}) => createAdminSchema.parse({ phone: '0811 000 0003', full_name: ' Tunde  Bello ', role: 'regional_admin', region: 'port_harcourt', ...o });

describe('schemas', () => {
  it('a regional admin needs a region; a global admin does not', () => {
    expect(createAdminSchema.safeParse({ phone: '0811', full_name: 'Ab', role: 'regional_admin' }).success).toBe(false);
    expect(createAdminSchema.safeParse({ phone: '0811', full_name: 'Ab', role: 'global_admin' }).success).toBe(true);
    expect(createAdminSchema.safeParse({ phone: '0811', full_name: 'Ab', role: 'regional_admin', region: 'mars' }).success).toBe(false);
  });
  it('revoke, blacklist and reassign need a reason of 5 to 500 characters', () => {
    expect(statusSchema.safeParse({ action: 'revoke', profile_id: P, reason: 'abc' }).success).toBe(false);
    expect(statusSchema.safeParse({ action: 'reinstate', profile_id: P }).success).toBe(true);
    expect(blacklistSchema.safeParse({ profile_id: P, reason: 'x'.repeat(501) }).success).toBe(false);
    expect(reassignSchema.safeParse({ listing_id: L, new_admin_id: P, reason: 'Admin on leave' }).success).toBe(true);
  });
});

describe('createAdmin', () => {
  it('makes the login, sets the name, promotes, and returns the referral link', async () => {
    const d = deps();
    const r = await createAdmin(d, body());
    expect(d.createLogin).toHaveBeenCalledWith('+2348110000003');
    expect(d.setName).toHaveBeenCalledWith(P, 'Tunde Bello');
    expect(d.promote).toHaveBeenCalledWith(P, 'regional_admin', 'port_harcourt');
    expect(r).toEqual({ profile_id: P, role: 'regional_admin', region: 'port_harcourt', referral_code: '7c1e44ab', referral_link: '/list?ref=7c1e44ab' });
  });
  it('promotes an existing seller without making a second login and keeps their name', async () => {
    const d = deps({ findProfileByPhone: vi.fn(async () => ({ id: P, role: 'seller', is_blacklisted: false, full_name: 'Tunde B' })) });
    await createAdmin(d, body());
    expect(d.createLogin).not.toHaveBeenCalled();
    expect(d.setName).not.toHaveBeenCalled();
  });
  it('refuses a blacklisted number with the plain message', async () => {
    const d = deps({ findProfileByPhone: vi.fn(async () => ({ id: P, role: 'seller', is_blacklisted: true, full_name: '' })) });
    await expect(createAdmin(d, body())).rejects.toMatchObject({ code: 'phone_blacklisted', message: 'This number is blacklisted and cannot be added.' });
    expect(d.promote).not.toHaveBeenCalled();
  });
  it('refuses someone who is already an admin and a bad phone', async () => {
    const d = deps({ findProfileByPhone: vi.fn(async () => ({ id: P, role: 'regional_admin', is_blacklisted: false, full_name: 'X Y' })) });
    await expect(createAdmin(d, body())).rejects.toMatchObject({ code: 'already_admin' });
    await expect(createAdmin(deps(), body({ phone: '123' }))).rejects.toMatchObject({ code: 'invalid_phone' });
  });
  it('a global admin gets no region and no referral link', async () => {
    const d = deps({ promote: vi.fn(async () => ({ code: null, error: null })) });
    const r = await createAdmin(d, body({ role: 'global_admin', region: null }));
    expect(d.promote).toHaveBeenCalledWith(P, 'global_admin', null);
    expect(r).toMatchObject({ region: null, referral_code: null, referral_link: null });
  });
  it('maps a refusal from the database', async () => {
    const d = deps({ promote: vi.fn(async () => ({ code: null, error: { code: '42501', message: 'not_authorized' } })) });
    await expect(createAdmin(d, body())).rejects.toMatchObject({ code: 'not_authorized' });
  });
});

describe('setStatus and reassign', () => {
  it('calls the right function', async () => {
    const d = deps();
    await setStatus(d, statusSchema.parse({ action: 'revoke', profile_id: P, reason: 'Left the team' }));
    expect(d.revoke).toHaveBeenCalledWith(P, 'Left the team');
    await setStatus(d, statusSchema.parse({ action: 'reinstate', profile_id: P }));
    expect(d.reinstate).toHaveBeenCalledWith(P);
  });
  it('explains a blacklisted admin cannot be changed, and a bad reassign target', async () => {
    const a = deps({ reinstate: vi.fn(async () => ({ code: '55006', message: 'blacklisted' })) });
    await expect(setStatus(a, statusSchema.parse({ action: 'reinstate', profile_id: P }))).rejects.toMatchObject({ code: 'phone_blacklisted' });
    const b = deps({ reassign: vi.fn(async () => ({ code: '23514', message: 'invalid_target_admin' })) });
    await expect(reassignListing(b, reassignSchema.parse({ listing_id: L, new_admin_id: P, reason: 'Admin on leave' }))).rejects.toMatchObject({ code: 'validation_failed' });
  });
});

describe('blacklistAdmin', () => {
  const b = blacklistSchema.parse({ profile_id: P, reason: 'Posed as the brand' });
  it('flags the profile then bans the login', async () => {
    const d = deps();
    expect(await blacklistAdmin(d, G, b)).toEqual({ profile_id: P, is_blacklisted: true, auth_banned: true });
    expect(d.blacklist).toHaveBeenCalledWith(G, P, 'Posed as the brand');
  });
  it('still succeeds when the ban fails, with a warning', async () => {
    for (const ban of [vi.fn(async () => false), vi.fn(async () => { throw new Error('x'); })]) {
      const r = await blacklistAdmin(deps({ banLogin: ban }), G, b);
      expect(r).toMatchObject({ is_blacklisted: true, auth_banned: false, warning: BAN_WARNING });
    }
  });
  it('refuses to blacklist yourself and maps a non-global caller', async () => {
    await expect(blacklistAdmin(deps(), P, b)).rejects.toMatchObject({ code: 'not_authorized' });
    const d = deps({ blacklist: vi.fn(async () => ({ code: '42501', message: 'not_authorized' })) });
    await expect(blacklistAdmin(d, G, b)).rejects.toMatchObject({ code: 'not_authorized' });
    expect(d.banLogin).not.toHaveBeenCalled();
  });
});
