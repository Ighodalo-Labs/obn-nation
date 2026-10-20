import { describe, expect, it } from 'vitest';
import { REASON_CHIPS, validateReason } from './reasons';

describe('validateReason', () => {
  it('accepts 5 to 500 characters after trimming', () => {
    expect(validateReason('  Blurry  photos ')).toEqual({ ok: true, reason: 'Blurry photos' });
    expect(validateReason('abcde').ok).toBe(true);
    expect(validateReason('x'.repeat(500)).ok).toBe(true);
  });
  it('refuses short, blank and long reasons', () => {
    expect(validateReason('abcd').ok).toBe(false);
    expect(validateReason('       ').ok).toBe(false);
    expect(validateReason('x'.repeat(501)).ok).toBe(false);
  });
  it('every quick-pick chip is a valid reason', () => {
    for (const c of REASON_CHIPS) expect(validateReason(c).ok).toBe(true);
  });
});
