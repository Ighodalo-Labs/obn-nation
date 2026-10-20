import { describe, expect, it, vi } from 'vitest';
import { isCronAuthorized, purgeDrafts, STALE_DAYS } from './purge';

describe('isCronAuthorized', () => {
  it('accepts only the exact bearer secret', () => {
    expect(isCronAuthorized('Bearer s3cret-s3cret-1', 's3cret-s3cret-1')).toBe(true);
    expect(isCronAuthorized('Bearer s3cret-s3cret-2', 's3cret-s3cret-1')).toBe(false);
    expect(isCronAuthorized('s3cret-s3cret-1', 's3cret-s3cret-1')).toBe(false);
    expect(isCronAuthorized(null, 's3cret-s3cret-1')).toBe(false);
    expect(isCronAuthorized('Bearer ', '')).toBe(false);
  });
});

describe('purgeDrafts', () => {
  const secret = 's3cret-s3cret-1';
  it('refuses a missing or wrong secret before touching anything', async () => {
    const d = { purgeRows: vi.fn(async () => []), removeFolder: vi.fn(async () => 0) };
    await expect(purgeDrafts(d, null, secret)).rejects.toMatchObject({ code: 'unauthenticated' });
    await expect(purgeDrafts(d, 'Bearer nope', secret)).rejects.toMatchObject({ code: 'unauthenticated' });
    expect(d.purgeRows).not.toHaveBeenCalled();
  });
  it('purges drafts older than 7 days and removes each folder', async () => {
    const d = { purgeRows: vi.fn(async () => ['s/a/', 's/b/']), removeFolder: vi.fn(async () => 3) };
    expect(await purgeDrafts(d, `Bearer ${secret}`, secret)).toEqual({ purged: 2, files_removed: 6 });
    expect(d.purgeRows).toHaveBeenCalledWith(STALE_DAYS);
    expect(d.removeFolder).toHaveBeenCalledWith('s/a');
  });
  it('keeps going when one folder fails to clear', async () => {
    const d = { purgeRows: vi.fn(async () => ['s/a/', 's/b/']), removeFolder: vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(2) };
    expect(await purgeDrafts(d, `Bearer ${secret}`, secret)).toEqual({ purged: 2, files_removed: 2 });
  });
});
