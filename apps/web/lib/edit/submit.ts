import { listingBody, UPLOAD_STOPPED } from '@/lib/listing/submit';
import type { FormDraft } from '@/lib/listing/schema';
import type { EditListing } from './core';

/** Browser side of the edit page. Outside calls are injected so this is easy to test. */

export interface EditSubmitDeps {
  post(url: string, body: unknown): Promise<{ ok: true; data: any } | { ok: false; error: { code: string; message: string } }>;
  uploadSigned(bucket: 'photos' | 'videos', path: string, token: string, file: Blob): Promise<{ error: string | null }>;
  onProgress(done: number, total: number): void;
}

export interface EditInput {
  token: string;
  original: EditListing;
  draft: FormDraft;
  keptPhotos: string[];
  keptVideo: string | null;
  newPhotos: Blob[];
  newVideo: Blob | null;
}

export type EditResult = { ok: true } | { ok: false; code: string; message: string; retry: boolean };

/** Form values for a listing that came from the server. */
export function draftFromListing(l: EditListing): FormDraft {
  return {
    region: l.region, category: l.category, title: l.title, description: l.description,
    brand: l.brand ?? '', model: l.model ?? '', size: l.size ?? '',
    condition_age: l.condition_age, condition_work: l.condition_work,
    price: String(Math.round(Number(l.price_ngn))),
  };
}

/** Only the text fields the seller really changed (doc 07 section 3.5). */
export function changedFields(original: EditListing, draft: FormDraft): Record<string, unknown> {
  const now = listingBody(draft);
  const before = listingBody(draftFromListing(original));
  const out: Record<string, unknown> = {};
  for (const key of ['category', 'title', 'description', 'price_ngn', 'condition_age', 'condition_work', 'brand', 'model', 'size'] as const) {
    if (now[key] !== before[key]) out[key] = now[key];
  }
  return out;
}

const retryable = (code: string) => ['network', 'internal_error', 'rate_limited', 'validation_failed', 'upload_failed'].includes(code);

export async function submitEdit(deps: EditSubmitDeps, input: EditInput): Promise<EditResult> {
  const fail = (code: string, message: string): EditResult => ({ ok: false, code, message, retry: retryable(code) });
  if (!input.newVideo && !input.keptVideo) return fail('validation_failed', 'A video is required.');
  const total = input.newPhotos.length + (input.newVideo ? 1 : 0);
  deps.onProgress(0, total);

  let newPhotoPaths: string[] = [];
  let newVideoPath: string | null = null;
  if (total > 0) {
    const r = await deps.post('/api/listings/edit/upload-url', { token: input.token, photo_count: input.newPhotos.length, has_video: Boolean(input.newVideo) });
    if (!r.ok) return fail(r.error.code, r.error.message);
    const { photos, video } = r.data as { photos: { path: string; token: string }[]; video: { path: string; token: string } | null };
    let done = 0;
    for (let i = 0; i < input.newPhotos.length; i++) {
      const u = await deps.uploadSigned('photos', photos[i].path, photos[i].token, input.newPhotos[i]);
      if (u.error) return fail('upload_failed', UPLOAD_STOPPED);
      deps.onProgress(++done, total);
    }
    if (input.newVideo && video) {
      const u = await deps.uploadSigned('videos', video.path, video.token, input.newVideo);
      if (u.error) return fail('upload_failed', UPLOAD_STOPPED);
      deps.onProgress(++done, total);
    }
    newPhotoPaths = photos.map((p) => p.path);
    newVideoPath = video?.path ?? null;
  }

  const video_path = (newVideoPath ?? input.keptVideo) as string;
  const r = await deps.post('/api/listings/resubmit', {
    token: input.token,
    listing: { ...changedFields(input.original, input.draft), photo_paths: [...input.keptPhotos, ...newPhotoPaths], video_path },
  });
  return r.ok ? { ok: true } : fail(r.error.code, r.error.message);
}
