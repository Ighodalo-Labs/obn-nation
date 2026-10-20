import { describe, expect, it } from 'vitest';
import { decide, decideSchema, JUST_HANDLED } from './decide';

const id = 'c1111111-1111-4111-8111-111111111111';
const run = (err: { code?: string } | null, action: 'claim' | 'approve' = 'approve') => {
  const calls: string[] = [];
  const p = decide({ call: async (fn) => { calls.push(fn); return err; } }, { listing_id: id, action });
  return { p, calls };
};

describe('decide', () => {
  it('maps the action to the database function', async () => {
    const a = run(null, 'claim'); await a.p; expect(a.calls).toEqual(['claim_listing']);
    const b = run(null, 'approve'); await b.p; expect(b.calls).toEqual(['approve_listing']);
  });
  it('tells the loser of a race the same plain message', async () => {
    await expect(run({ code: 'OB005' }).p).rejects.toMatchObject({ code: 'already_claimed', message: JUST_HANDLED, status: 409 });
    await expect(run({ code: '55000' }).p).rejects.toMatchObject({ message: JUST_HANDLED });
  });
  it('maps other database errors', async () => {
    await expect(run({ code: '42501' }).p).rejects.toMatchObject({ code: 'not_authorized' });
    await expect(run({ code: 'P0002' }).p).rejects.toMatchObject({ code: 'listing_not_found' });
    await expect(run({ code: 'XX000' }).p).rejects.toMatchObject({ code: 'internal_error' });
  });
  it('validates the body', () => {
    expect(decideSchema.safeParse({ listing_id: 'x', action: 'approve' }).success).toBe(false);
    expect(decideSchema.safeParse({ listing_id: id, action: 'delete' }).success).toBe(false);
  });
});
