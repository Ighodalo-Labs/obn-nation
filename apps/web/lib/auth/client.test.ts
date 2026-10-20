import { afterEach, describe, expect, it, vi } from 'vitest';
import { clock, formatSentTo, postJson } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('formatSentTo', () => {
  it('hides the middle digits', () => expect(formatSentTo('+2348031234567')).toBe('+234 803 *** 4567'));
  it('returns odd input unchanged', () => expect(formatSentTo('abc')).toBe('abc'));
});

describe('clock', () => {
  it.each([[42, '0:42'], [60, '1:00'], [0, '0:00'], [-3, '0:00'], [599, '9:59']])('%d -> %s', (n, s) => expect(clock(n)).toBe(s));
});

describe('postJson', () => {
  it('returns data on success', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ sent: true }), { status: 200 }));
    expect(await postJson('/x', {})).toEqual({ ok: true, data: { sent: true } });
  });
  it('returns the API error body', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { code: 'invalid_code', message: 'That code is not right. 4 tries left.', details: { tries_left: 4 } } }), { status: 400 }));
    const r = await postJson('/x', {});
    expect(r).toEqual({ ok: false, error: { code: 'invalid_code', message: 'That code is not right. 4 tries left.', details: { tries_left: 4 } } });
  });
  it('turns a network failure into a friendly error', async () => {
    vi.stubGlobal('fetch', async () => { throw new TypeError('failed'); });
    const r = await postJson('/x', {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('network');
  });
  it('survives a non-JSON error page', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>', { status: 502 }));
    const r = await postJson('/x', {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('internal_error');
  });
});
