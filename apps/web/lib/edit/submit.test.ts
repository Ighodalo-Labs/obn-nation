import { describe, expect, it, vi } from 'vitest';
import { changedFields, draftFromListing, submitEdit, type EditSubmitDeps } from './submit';
import type { EditListing } from './core';

const F = 'S/L';
const original: EditListing = {
  listing_id: 'L', seller_id: 'S', region: 'delta', category: 'fridges', title: 'Fridge', description: 'Cools well and works.', price_ngn: '150000.00',
  condition_age: 'neatly_used', condition_work: 'working_perfectly', brand: 'Samsung', model: null, size: null,
  photo_urls: [`${F}/1.webp`, `${F}/2.webp`], video_url: `${F}/video.mp4`, rejection_reason: 'Blurry', expires_at: 'X',
};
const blob = (n: string) => new Blob([n]);
function deps(over: Partial<EditSubmitDeps> = {}) {
  const posts: [string, any][] = [];
  const d: EditSubmitDeps = {
    post: vi.fn(async (url: string, body: any) => {
      posts.push([url, body]);
      return url.endsWith('upload-url')
        ? { ok: true as const, data: { photos: [{ path: `${F}/r1-1.webp`, token: 't1' }], video: body.has_video ? { path: `${F}/r1-video.mp4`, token: 'tv' } : null } }
        : { ok: true as const, data: { status: 'pending_review' } };
    }),
    uploadSigned: vi.fn(async () => ({ error: null })),
    onProgress: vi.fn(),
    ...over,
  };
  return { d, posts };
}

describe('changedFields', () => {
  it('is empty when nothing changed', () => expect(changedFields(original, draftFromListing(original))).toEqual({}));
  it('lists only what changed, with the price as a number and blanks as null', () => {
    const d = { ...draftFromListing(original), title: 'Fridge 380L', price: '140000', brand: '  ' };
    expect(changedFields(original, d)).toEqual({ title: 'Fridge 380L', price_ngn: 140000, brand: null });
  });
});

describe('submitEdit', () => {
  const base = { token: 'T', original, draft: draftFromListing(original), keptPhotos: [`${F}/1.webp`], keptVideo: `${F}/video.mp4`, newPhotos: [] as Blob[], newVideo: null as Blob | null };

  it('with no new files, goes straight to resubmit and never asks for upload links', async () => {
    const { d, posts } = deps();
    expect(await submitEdit(d, base)).toEqual({ ok: true });
    expect(posts.map((p) => p[0])).toEqual(['/api/listings/resubmit']);
    expect(posts[0][1].listing).toEqual({ photo_paths: [`${F}/1.webp`], video_path: `${F}/video.mp4` });
  });
  it('uploads new files to the signed paths and resubmits kept plus new', async () => {
    const { d, posts } = deps();
    const r = await submitEdit(d, { ...base, newPhotos: [blob('a')], newVideo: blob('v') });
    expect(r).toEqual({ ok: true });
    expect((d.uploadSigned as any).mock.calls.map((c: any[]) => `${c[0]}:${c[1]}:${c[2]}`)).toEqual([`photos:${F}/r1-1.webp:t1`, `videos:${F}/r1-video.mp4:tv`]);
    expect(posts[1][1].listing).toMatchObject({ photo_paths: [`${F}/1.webp`, `${F}/r1-1.webp`], video_path: `${F}/r1-video.mp4` });
  });
  it('does not resubmit when an upload fails, and offers a retry', async () => {
    const { d, posts } = deps({ uploadSigned: vi.fn(async () => ({ error: 'x' })) });
    const r = await submitEdit(d, { ...base, newPhotos: [blob('a')] });
    expect(r).toMatchObject({ ok: false, code: 'upload_failed', retry: true });
    expect(posts.map((p) => p[0])).toEqual(['/api/listings/edit/upload-url']);
  });
  it('needs a video: removed with no replacement is refused before any call', async () => {
    const { d, posts } = deps();
    const r = await submitEdit(d, { ...base, keptVideo: null });
    expect(r).toMatchObject({ ok: false, message: 'A video is required.' });
    expect(posts).toHaveLength(0);
  });
  it('shows the used-link message and offers no retry', async () => {
    const msg = 'This link has already been used. If you need to change something else, ask your admin for a new link.';
    const { d } = deps({ post: vi.fn(async () => ({ ok: false as const, error: { code: 'token_used', message: msg } })) });
    expect(await submitEdit(d, base)).toEqual({ ok: false, code: 'token_used', message: msg, retry: false });
  });
});
