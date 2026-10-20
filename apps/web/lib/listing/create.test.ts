import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { createBodySchema, createOrSubmit, type CreateDeps, type ListingRow } from './create';

const S = 'b0000000-0000-4000-8000-000000000001';
const K = '11111111-1111-4111-8111-111111111111';
const L = 'c1111111-1111-4111-8111-111111111111';
const listing = { region: 'delta', category: 'fridges', title: 'Samsung fridge', description: 'Cools well. Two years old.', price_ngn: 150000, condition_age: 'neatly_used', condition_work: 'working_perfectly' };
const draftRow: ListingRow = { id: L, status: 'draft', submitted_at: null };
const call1 = (n = 2, v = true) => createBodySchema.parse({ client_key: K, submit: false, listing, media_plan: { photo_count: n, has_video: v } });
const call2 = (photo_paths: string[], video_path: string = `${S}/${L}/video.mp4`) => createBodySchema.parse({ client_key: K, submit: true, listing, media: { photo_paths, video_path } });
const paths = (n: number) => Array.from({ length: n }, (_, i) => `${S}/${L}/${i + 1}.webp`);

function deps(over: Partial<CreateDeps> = {}): CreateDeps {
  return {
    findByKey: vi.fn(async () => null),
    insertDraft: vi.fn(async () => draftRow),
    updateDraft: vi.fn(async () => {}),
    listFiles: vi.fn(async (b) => (b === 'photos' ? ['1.webp', '2.webp'] : ['video.mp4'])),
    submitDraft: vi.fn(async () => ({ id: L, status: 'pending_review' as const, submitted_at: 'T' })),
    ...over,
  };
}

describe('body schema', () => {
  it('rejects bad input', () => {
    expect(createBodySchema.safeParse({ client_key: 'x', submit: false }).success).toBe(false);
    expect(createBodySchema.safeParse({ client_key: K, submit: false, listing: { ...listing, price_ngn: 0 }, media_plan: { photo_count: 1, has_video: false } }).success).toBe(false);
    expect(createBodySchema.safeParse({ client_key: K, submit: false, listing, media_plan: { photo_count: 7, has_video: false } }).success).toBe(false);
  });
  it('requires a video', () => {
    expect(createBodySchema.safeParse({ client_key: K, submit: false, listing, media_plan: { photo_count: 1, has_video: false } }).success).toBe(false);
    expect(createBodySchema.safeParse({ client_key: K, submit: true, listing, media: { photo_paths: [`${S}/${L}/1.webp`], video_path: null } }).success).toBe(false);
  });
});

describe('call 1 (create the draft)', () => {
  it('creates a draft, passes the cookie ref and returns upload paths', async () => {
    const d = deps();
    const r = await createOrSubmit(d, S, 'abcdef01', call1(2));
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ listing_id: L, status: 'draft', created: true, upload: { photos: paths(2), video: `${S}/${L}/video.mp4` } });
    expect((d.insertDraft as any).mock.calls[0][0]).toMatchObject({ seller_id: S, client_key: K, ref_code: 'abcdef01', brand: null });
  });
  it('a retry with the same client_key finds the same draft (200, no second insert)', async () => {
    const d = deps({ findByKey: vi.fn(async () => draftRow) });
    const r = await createOrSubmit(d, S, null, call1());
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ listing_id: L, created: false });
    expect(d.insertDraft).not.toHaveBeenCalled();
    expect(d.updateDraft).toHaveBeenCalled();
  });
  it('gives no upload paths when the listing was already submitted', async () => {
    const d = deps({ findByKey: vi.fn(async () => ({ ...draftRow, status: 'pending_review' as const })) });
    const r = await createOrSubmit(d, S, null, call1());
    expect((r.body as { upload: unknown }).upload).toBeNull();
    expect(d.updateDraft).not.toHaveBeenCalled();
  });
});

describe('call 2 (submit)', () => {
  const found = () => deps({ findByKey: vi.fn(async () => draftRow) });
  it('submits when all files are there', async () => {
    const d = found();
    const r = await createOrSubmit(d, S, null, call2(paths(2)));
    expect(r).toEqual({ status: 200, body: { listing_id: L, status: 'pending_review', submitted_at: 'T' } });
    expect((d.submitDraft as any).mock.calls[0].slice(2)).toEqual([paths(2), `${S}/${L}/video.mp4`]);
  });
  it('unknown client_key is not found', async () => {
    await expect(createOrSubmit(deps(), S, null, call2(paths(1)))).rejects.toMatchObject({ code: 'listing_not_found' });
  });
  it('is idempotent once submitted', async () => {
    const d = deps({ findByKey: vi.fn(async () => ({ id: L, status: 'pending_review' as const, submitted_at: 'T0' })) });
    const r = await createOrSubmit(d, S, null, call2(paths(2)));
    expect(r.body).toMatchObject({ already_submitted: true, status: 'pending_review', submitted_at: 'T0' });
    expect(d.submitDraft).not.toHaveBeenCalled();
  });
  it('refuses paths outside the seller and listing folder', async () => {
    for (const bad of [[`${S}/other/1.webp`], [`evil/${L}/1.webp`], [`${S}/${L}/2.webp`], [`${S}/${L}/1.webp/../x`]]) {
      await expect(createOrSubmit(found(), S, null, call2(bad))).rejects.toMatchObject({ code: 'invalid_media_path' });
    }
    await expect(createOrSubmit(found(), S, null, call2(paths(1), `${S}/${L}/x.mp4`))).rejects.toMatchObject({ code: 'invalid_media_path' });
  });
  it('refuses to submit when a file did not finish uploading', async () => {
    const d = deps({ findByKey: vi.fn(async () => draftRow), listFiles: vi.fn(async () => ['1.webp']) });
    const e = await createOrSubmit(d, S, null, call2(paths(2))).catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ code: 'validation_failed', message: 'Upload stopped. Tap Try again.' });
    expect(d.submitDraft).not.toHaveBeenCalled();
  });
  it('refuses to submit when the video file is missing', async () => {
    const d = deps({ findByKey: vi.fn(async () => draftRow), listFiles: vi.fn(async (b) => (b === 'photos' ? ['1.webp', '2.webp'] : [])) });
    await expect(createOrSubmit(d, S, null, call2(paths(2)))).rejects.toMatchObject({ code: 'validation_failed' });
    expect(d.submitDraft).not.toHaveBeenCalled();
  });
  it('a double tap that loses the race still answers success', async () => {
    const find = vi.fn().mockResolvedValueOnce(draftRow).mockResolvedValueOnce({ id: L, status: 'pending_review', submitted_at: 'T1' });
    const d = deps({ findByKey: find, submitDraft: vi.fn(async () => null) });
    const r = await createOrSubmit(d, S, null, call2(paths(2)));
    expect(r.body).toMatchObject({ already_submitted: true, submitted_at: 'T1' });
  });
  it('a rejected listing cannot be resubmitted here', async () => {
    const d = deps({ findByKey: vi.fn(async () => ({ id: L, status: 'rejected' as const, submitted_at: 'T' })) });
    await expect(createOrSubmit(d, S, null, call2(paths(2)))).rejects.toMatchObject({ code: 'invalid_state' });
  });
});
