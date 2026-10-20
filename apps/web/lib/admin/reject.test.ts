import { describe, expect, it, vi } from 'vitest';
import { firstName, reissueLink, rejectListing, rejectSchema, type RejectDeps } from './reject';

const L = 'c1111111-1111-4111-8111-111111111111';
const A = 'a0000000-0000-4000-8000-000000000002';
function deps(over: Partial<RejectDeps> = {}): RejectDeps {
  return {
    newToken: () => ({ hash: 'h'.repeat(64), link: 'https://obn.test/list/edit?token=T' }),
    saveRejection: vi.fn(async () => ({ expiresAt: '2026-11-19T10:00:00Z', error: null })),
    saveReissue: vi.fn(async () => ({ expiresAt: '2026-11-19T10:00:00Z', error: null })),
    loadSeller: vi.fn(async () => ({ phone: '+2348031234567', fullName: 'Ada Obi', title: 'Fridge', reason: 'Photos are blurry.' })),
    notify: vi.fn(async () => ({ status: 'sent' as const, sid: 'SM1' })),
    ...over,
  };
}

describe('rejectSchema', () => {
  it('trims and flattens the reason, and enforces 5 to 500 characters', () => {
    expect(rejectSchema.parse({ listing_id: L, reason: '  Photos   are\nblurry ' }).reason).toBe('Photos are blurry');
    expect(rejectSchema.safeParse({ listing_id: L, reason: 'no' }).success).toBe(false);
    expect(rejectSchema.safeParse({ listing_id: L, reason: '    ab    ' }).success).toBe(false);
    expect(rejectSchema.safeParse({ listing_id: L, reason: 'x'.repeat(501) }).success).toBe(false);
    expect(rejectSchema.safeParse({ listing_id: L, reason: 'x'.repeat(500) }).success).toBe(true);
  });
});

describe('rejectListing', () => {
  it('saves the rejection with the token hash, then sends the link', async () => {
    const d = deps();
    const r = await rejectListing(d, A, { listing_id: L, reason: 'Photos are blurry.' });
    expect(d.saveRejection).toHaveBeenCalledWith(A, L, 'Photos are blurry.', 'h'.repeat(64));
    expect(d.notify).toHaveBeenCalledWith('+2348031234567', { firstName: 'Ada', title: 'Fridge', reason: 'Photos are blurry.', link: 'https://obn.test/list/edit?token=T' });
    expect(r).toEqual({ listing_id: L, status: 'rejected', edit_link_expires_at: '2026-11-19T10:00:00Z', notification: { status: 'sent', twilio_sid: 'SM1' } });
  });
  it('still answers 200-style when WhatsApp fails, so the admin can send a new link', async () => {
    const r = await rejectListing(deps({ notify: vi.fn(async () => ({ status: 'failed' as const, reason: 'twilio_63016' })) }), A, { listing_id: L, reason: 'Photos are blurry.' });
    expect(r.notification).toEqual({ status: 'failed', reason: 'twilio_63016' });
  });
  it('treats a thrown send as a failed message, not an error', async () => {
    const r = await rejectListing(deps({ notify: vi.fn(async () => { throw new Error('boom'); }) }), A, { listing_id: L, reason: 'Photos are blurry.' });
    expect(r.notification.status).toBe('failed');
  });
  it('never sends anything when the database refuses', async () => {
    for (const [code, api] of [['42501', 'not_authorized'], ['P0002', 'listing_not_found'], ['55000', 'invalid_state']] as const) {
      const d = deps({ saveRejection: vi.fn(async () => ({ expiresAt: null, error: { code } })) });
      await expect(rejectListing(d, A, { listing_id: L, reason: 'Photos are blurry.' })).rejects.toMatchObject({ code: api });
      expect(d.notify).not.toHaveBeenCalled();
    }
  });
});

describe('reissueLink', () => {
  it('makes a new link and sends it with the saved reason', async () => {
    const d = deps();
    const r = await reissueLink(d, A, L);
    expect(d.saveReissue).toHaveBeenCalledWith(A, L, 'h'.repeat(64));
    expect(r.notification.status).toBe('sent');
  });
  it('refuses a listing that is not rejected', async () => {
    const d = deps({ saveReissue: vi.fn(async () => ({ expiresAt: null, error: { code: '55000' } })) });
    await expect(reissueLink(d, A, L)).rejects.toMatchObject({ code: 'invalid_state' });
  });
});

it('firstName', () => { expect(firstName('  Ada  Obi ')).toBe('Ada'); expect(firstName('')).toBe(''); });
