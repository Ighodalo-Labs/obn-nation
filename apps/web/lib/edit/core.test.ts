import { describe, expect, it, vi } from 'vitest';
import { loadForEdit, newPhotoPath, newVideoPath, resubmit, resubmitSchema, uploadUrls, type EditDeps, type EditListing } from './core';

const T = '6f1c2b7e-3a42-4d8e-9f10-5b2c7a9d0e11';
const S = 'b0000000-0000-4000-8000-000000000001';
const L = 'c1111111-1111-4111-8111-111111111111';
const F = `${S}/${L}`;
const listing: EditListing = {
  listing_id: L, seller_id: S, region: 'delta', category: 'fridges', title: 'Fridge', description: 'Cools well and works.', price_ngn: 150000,
  condition_age: 'neatly_used', condition_work: 'working_perfectly', brand: null, model: null, size: null,
  photo_urls: [`${F}/1.webp`, `${F}/2.webp`], video_url: `${F}/video.mp4`, rejection_reason: 'Blurry', expires_at: '2026-11-19T10:00:00Z',
};
function deps(over: Partial<EditDeps> = {}): EditDeps {
  return {
    getForEdit: vi.fn(async () => ({ data: listing, error: null })),
    resubmitCount: vi.fn(async () => 0),
    signedUpload: vi.fn(async (_b, p) => ({ signedUrl: `https://x/${p}`, token: 'tk' })),
    listFiles: vi.fn(async (b) => (b === 'photos' ? ['r1-1.webp', '1.webp'] : ['r1-video.mp4'])),
    resubmit: vi.fn(async () => ({ id: L, error: null })),
    hash: (t) => `hash:${t}`,
    ...over,
  };
}
const body = (l: object) => resubmitSchema.parse({ token: T, listing: { photo_paths: [`${F}/1.webp`], video_path: `${F}/video.mp4`, ...l } });

describe('loadForEdit', () => {
  it('returns the listing for a valid token and hashes the token', async () => {
    const d = deps();
    await expect(loadForEdit(d, T)).resolves.toMatchObject({ listing_id: L });
    expect(d.getForEdit).toHaveBeenCalledWith(`hash:${T}`);
  });
  it('refuses a token with the wrong shape without touching the database', async () => {
    const d = deps();
    await expect(loadForEdit(d, 'nope')).rejects.toMatchObject({ code: 'token_invalid' });
    expect(d.getForEdit).not.toHaveBeenCalled();
  });
  it.each([['OB001', 'token_invalid'], ['OB002', 'token_used'], ['OB003', 'token_expired'], ['OB004', 'token_revoked'], ['55000', 'invalid_state']])(
    'maps database code %s to %s',
    async (code, api) => {
      await expect(loadForEdit(deps({ getForEdit: vi.fn(async () => ({ data: null, error: { code } })) }), T)).rejects.toMatchObject({ code: api });
    },
  );
});

describe('uploadUrls', () => {
  it('names new files with the round prefix so old files are never overwritten', async () => {
    const r = await uploadUrls(deps({ resubmitCount: vi.fn(async () => 1) }), { token: T, photo_count: 2, has_video: true });
    expect(r.photos.map((p) => p.path)).toEqual([newPhotoPath(F, 2, 1), newPhotoPath(F, 2, 2)]);
    expect(r.video?.path).toBe(newVideoPath(F, 2));
  });
  it('returns no video when none is requested and checks the token first', async () => {
    const r = await uploadUrls(deps(), { token: T, photo_count: 0, has_video: false });
    expect(r).toMatchObject({ photos: [], video: null });
    await expect(uploadUrls(deps({ getForEdit: vi.fn(async () => ({ data: null, error: { code: 'OB002' } })) }), { token: T, photo_count: 1, has_video: false })).rejects.toMatchObject({ code: 'token_used' });
  });
});

describe('resubmit', () => {
  it('keeps existing files and sends only the changed text', async () => {
    const d = deps();
    const r = await resubmit(d, body({ title: 'Fridge 380L' }));
    expect(r).toEqual({ listing_id: L, status: 'pending_review' });
    expect(d.resubmit).toHaveBeenCalledWith(`hash:${T}`, { title: 'Fridge 380L', photo_urls: [`${F}/1.webp`], video_url: `${F}/video.mp4` });
  });
  it('accepts new files from this round once they are uploaded', async () => {
    const d = deps();
    await resubmit(d, body({ photo_paths: [`${F}/1.webp`, `${F}/r1-1.webp`], video_path: `${F}/r1-video.mp4` }));
    expect(d.listFiles).toHaveBeenCalledTimes(2);
    expect(d.resubmit).toHaveBeenCalled();
  });
  it('does not use the token when a new file is missing', async () => {
    const d = deps({ listFiles: vi.fn(async () => []) });
    await expect(resubmit(d, body({ photo_paths: [`${F}/r1-1.webp`] }))).rejects.toMatchObject({ code: 'validation_failed', message: 'Upload stopped. Tap Try again.' });
    expect(d.resubmit).not.toHaveBeenCalled();
  });
  it('refuses paths from another listing, other rounds, duplicates or a wrong video', async () => {
    for (const l of [
      { photo_paths: [`${S}/other/1.webp`] },
      { photo_paths: [`${F}/r2-1.webp`] },
      { photo_paths: [`${F}/1.webp`, `${F}/1.webp`] },
      { photo_paths: [`${F}/../x.webp`] },
      { video_path: `${F}/other.mp4` },
    ]) {
      const d = deps();
      await expect(resubmit(d, body(l))).rejects.toMatchObject({ code: 'invalid_media_path' });
      expect(d.resubmit).not.toHaveBeenCalled();
    }
  });
  it('requires a video and at least one photo', () => {
    expect(resubmitSchema.safeParse({ token: T, listing: { photo_paths: [`${F}/1.webp`] } }).success).toBe(false);
    expect(resubmitSchema.safeParse({ token: T, listing: { photo_paths: [], video_path: 'x' } }).success).toBe(false);
  });
  it('a double tap: the second call is refused by the database', async () => {
    const d = deps({ getForEdit: vi.fn().mockResolvedValueOnce({ data: listing, error: null }).mockResolvedValueOnce({ data: null, error: { code: 'OB002' } }) });
    await resubmit(d, body({}));
    await expect(resubmit(d, body({}))).rejects.toMatchObject({ code: 'token_used' });
  });
  it('maps a database refusal and does not report success', async () => {
    const d = deps({ resubmit: vi.fn(async () => ({ id: null, error: { code: '23514', message: 'invalid_media_path' } })) });
    await expect(resubmit(d, body({}))).rejects.toMatchObject({ code: 'invalid_media_path' });
  });
});
