import { describe, expect, it } from 'vitest';
import { clearForm, loadForm, saveForm } from './draft';
import { EMPTY_DRAFT } from './schema';

function memory(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe('saved form (FM-2, FM-8)', () => {
  it('starts fresh with a client key when nothing is saved', () => {
    const f = loadForm(memory());
    expect(f.step).toBe(1);
    expect(f.draft).toEqual(EMPTY_DRAFT);
    expect(f.clientKey).toMatch(/^[0-9a-f-]{36}$/);
  });
  it('round-trips and keeps the same client_key', () => {
    const store = memory();
    const first = loadForm(store);
    saveForm({ ...first, step: 2, draft: { ...first.draft, title: 'Fridge', price: '150000' } }, store);
    const again = loadForm(store);
    expect(again.clientKey).toBe(first.clientKey);
    expect(again.step).toBe(2);
    expect(again.draft.title).toBe('Fridge');
  });
  it('ignores a broken or tampered value', () => {
    expect(loadForm(memory({ obn_listing_form_v1: '{not json' })).step).toBe(1);
    const f = loadForm(memory({ obn_listing_form_v1: JSON.stringify({ step: 9, clientKey: '../../x', draft: { price: '12ab34', title: 5 } }) }));
    expect(f.step).toBe(1);
    expect(f.clientKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(f.draft.price).toBe('1234');
    expect(f.draft.title).toBe('');
  });
  it('works when storage is blocked', () => {
    expect(() => saveForm(loadForm(null), null)).not.toThrow();
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); }, removeItem: () => { throw new Error('x'); } };
    expect(loadForm(throwing).step).toBe(1);
    expect(() => saveForm(loadForm(null), throwing)).not.toThrow();
    expect(() => clearForm(throwing)).not.toThrow();
  });
  it('clearing makes the next form get a new client key', () => {
    const store = memory();
    const a = loadForm(store);
    saveForm(a, store);
    clearForm(store);
    expect(loadForm(store).clientKey).not.toBe(a.clientKey);
  });
});
