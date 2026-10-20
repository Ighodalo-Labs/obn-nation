import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { handle, readJson, requireSameOrigin } from './http';

const post = (body: string, type = 'application/json', headers: Record<string, string> = {}) =>
  new Request('https://obn.example/api/x', { method: 'POST', body, headers: { 'content-type': type, ...headers } });

describe('readJson', () => {
  const schema = z.object({ phone: z.string().min(1) });
  it('returns parsed data', async () => {
    expect(await readJson(post('{"phone":"0803"}'), schema)).toEqual({ phone: '0803' });
  });
  it('refuses a body that is not JSON content', async () => {
    await expect(readJson(post('phone=1', 'application/x-www-form-urlencoded'), schema)).rejects.toMatchObject({ code: 'validation_failed' });
  });
  it('refuses broken JSON', async () => {
    await expect(readJson(post('{'), schema)).rejects.toMatchObject({ code: 'validation_failed' });
  });
  it('lists the fields that failed', async () => {
    const err = await readJson(post('{}'), schema).catch((e) => e as ApiError);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).details).toEqual({ fields: [{ field: 'phone', reason: 'Required' }] });
  });
});

describe('requireSameOrigin', () => {
  it('passes when Origin matches', () => {
    expect(() => requireSameOrigin(post('{}', 'application/json', { origin: 'https://obn.example' }), 'https://obn.example')).not.toThrow();
  });
  it('refuses another site and a missing Origin', () => {
    expect(() => requireSameOrigin(post('{}', 'application/json', { origin: 'https://evil.example' }), 'https://obn.example')).toThrow(ApiError);
    expect(() => requireSameOrigin(post('{}'), 'https://obn.example')).toThrow(ApiError);
  });
});

describe('handle', () => {
  it('adds a request id to success and to errors', async () => {
    const okRes = await handle(async () => Response.json({ a: 1 }))(post('{}'));
    expect(okRes.headers.get('x-request-id')).toMatch(/^req_[0-9a-f]{8}$/);
    const errRes = await handle(async () => { throw new ApiError('phone_blocked'); })(post('{}'));
    expect(errRes.status).toBe(403);
    const body = await errRes.json();
    expect(body.error.code).toBe('phone_blocked');
    expect(body.request_id).toBe(errRes.headers.get('x-request-id'));
  });
  it('hides unexpected errors', async () => {
    const res = await handle(async () => { throw new Error('secret db detail'); })(post('{}'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('secret');
  });
  it('sets Retry-After on rate limits', async () => {
    const res = await handle(async () => { throw new ApiError('rate_limited', 'wait', { retry_after_seconds: 42 }); })(post('{}'));
    expect(res.headers.get('retry-after')).toBe('42');
  });
});
