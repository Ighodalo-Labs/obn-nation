import { describe, expect, it } from 'vitest';
import { readSubscription, subscribeBody, tooMany } from './newsletter';

const base = { wantsEmail: true, wantsSms: false, email: 'Ada@Example.com ', phone: '', consent: true, company: '' };
const read = (o: Partial<typeof base>) => readSubscription(subscribeBody.parse({ ...base, ...o }));

describe('newsletter rules', () => {
  it('stores a lower-case email', () => {
    expect(read({})).toEqual({ kind: 'store', email: 'ada@example.com', phone: null, wantsEmail: true, wantsSms: false });
  });
  it('normalises a Nigerian phone for SMS', () => {
    expect(read({ wantsEmail: false, wantsSms: true, phone: '0803 123 4567' })).toMatchObject({ kind: 'store', phone: '+2348031234567', email: null });
  });
  it('takes both', () => {
    expect(read({ wantsSms: true, phone: '08031234567' })).toMatchObject({ kind: 'store', email: 'ada@example.com', phone: '+2348031234567' });
  });
  it('needs a choice', () => {
    expect(read({ wantsEmail: false })).toMatchObject({ kind: 'invalid', field: 'choice' });
  });
  it('refuses a bad email, a bad phone, and missing consent', () => {
    expect(read({ email: 'nope' })).toMatchObject({ kind: 'invalid', field: 'email' });
    expect(read({ wantsEmail: false, wantsSms: true, phone: '12345' })).toMatchObject({ kind: 'invalid', field: 'phone' });
    expect(read({ consent: false })).toMatchObject({ kind: 'invalid', field: 'consent' });
  });
  it('ignores a filled trap field', () => {
    expect(read({ company: 'Acme' })).toEqual({ kind: 'ignore' });
  });
  it('limits one address to 5 an hour', () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(tooMany('ip-a', t + i)).toBe(false);
    expect(tooMany('ip-a', t + 10)).toBe(true);
    expect(tooMany('ip-b', t + 10)).toBe(false);
    expect(tooMany('ip-a', t + 3_700_000)).toBe(false);
  });
});
