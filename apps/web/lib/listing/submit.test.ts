import { describe, expect, it, vi } from 'vitest';
import { EMPTY_DRAFT } from './schema';
import { listingBody, submitListing, UPLOAD_STOPPED, type SubmitDeps } from './submit';

const draft = { ...EMPTY_DRAFT, region: 'delta', category: 'fridges', title: ' Samsung fridge ', description: 'Cools well. Two years old.', condition_age: 'neatly_used', condition_work: 'working_perfectly', price: '150000', brand: ' ', model: 'RT38' };
const blob = (n: string) => new Blob([n]);
const plan = { listing_id: 'L', status: 'draft', created: true, upload: { photos: ['s/L/1.webp', 's/L/2.webp'], video: 's/L/video.mp4' } };

function deps(over: Partial<SubmitDeps> = {}) {
  const calls: any[] = [];
  const d: SubmitDeps = {
    post: vi.fn(async (b: any) => { calls.push(b); return b.submit ? { ok: true as const, data: { status: 'pending_review', submitted_at: 'T' } } : { ok: true as const, data: plan }; }),
    upload: vi.fn(async () => ({ error: null })),
    onProgress: vi.fn(),
    ...over,
  };
  return { d, calls };
}

describe('listingBody', () => {
  it('trims, turns the price into a number and blanks into null', () => {
    expect(listingBody(draft)).toMatchObject({ title: 'Samsung fridge', price_ngn: 150000, brand: null, model: 'RT38', size: null });
  });
});

describe('submitListing', () => {
  it('creates, uploads in order, then submits the uploaded paths', async () => {
    const { d, calls } = deps();
    const r = await submitListing(d, { clientKey: 'K', draft, photos: [blob('a'), blob('b')], video: blob('v') });
    expect(r).toEqual({ ok: true, status: 'pending_review', submittedAt: 'T' });
    expect(calls[0]).toMatchObject({ client_key: 'K', submit: false, media_plan: { photo_count: 2, has_video: true } });
    expect((d.upload as any).mock.calls.map((c: any[]) => `${c[0]}:${c[1]}`)).toEqual(['photos:s/L/1.webp', 'photos:s/L/2.webp', 'videos:s/L/video.mp4']);
    expect(calls[1]).toMatchObject({ submit: true, media: { photo_paths: ['s/L/1.webp', 's/L/2.webp'], video_path: 's/L/video.mp4' } });
    expect((d.onProgress as any).mock.calls.at(-1)).toEqual([3, 3]);
  });

  it('sends video_path null when there is no video', async () => {
    const { d } = deps({ post: vi.fn(async (b: any) => (b.submit ? { ok: true as const, data: { status: 'pending_review', submitted_at: 'T' } } : { ok: true as const, data: { ...plan, upload: { photos: ['s/L/1.webp'], video: null } } })) });
    await submitListing(d, { clientKey: 'K', draft, photos: [blob('a')], video: null });
    expect((d.post as any).mock.calls[1][0].media).toEqual({ photo_paths: ['s/L/1.webp'], video_path: null });
  });

  it('stops with a retry message when an upload fails, and never submits', async () => {
    const { d } = deps({ upload: vi.fn().mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: 'boom' }) });
    const r = await submitListing(d, { clientKey: 'K', draft, photos: [blob('a'), blob('b')], video: null });
    expect(r).toEqual({ ok: false, code: 'upload_failed', message: UPLOAD_STOPPED, retry: true });
    expect((d.post as any).mock.calls).toHaveLength(1);
  });

  it('shows the daily limit message and does not offer a retry', async () => {
    const msg = "You have reached today's limit of 10 listings. Please come back tomorrow.";
    const { d } = deps({ post: vi.fn(async () => ({ ok: false as const, error: { code: 'daily_limit_reached', message: msg } })) });
    const r = await submitListing(d, { clientKey: 'K', draft, photos: [blob('a')], video: null });
    expect(r).toEqual({ ok: false, code: 'daily_limit_reached', message: msg, retry: false });
    expect(d.upload).not.toHaveBeenCalled();
  });

  it('offers a retry after a network failure on submit', async () => {
    let n = 0;
    const { d } = deps({ post: vi.fn(async () => (++n === 1 ? { ok: true as const, data: plan } : { ok: false as const, error: { code: 'network', message: 'No connection.' } })) });
    const r = await submitListing(d, { clientKey: 'K', draft, photos: [blob('a'), blob('b')], video: null });
    expect(r).toMatchObject({ ok: false, retry: true });
  });

  it('treats an already submitted listing as success without uploading', async () => {
    const { d } = deps({ post: vi.fn(async () => ({ ok: true as const, data: { listing_id: 'L', status: 'pending_review', created: false, upload: null } })) });
    const r = await submitListing(d, { clientKey: 'K', draft, photos: [blob('a')], video: null });
    expect(r).toMatchObject({ ok: true, status: 'pending_review' });
    expect(d.upload).not.toHaveBeenCalled();
  });
});
