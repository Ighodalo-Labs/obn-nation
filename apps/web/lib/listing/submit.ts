import type { FormDraft } from './schema';
import { priceDigits } from './schema';

/** Browser side of the submit flow (PRD FM-7 to FM-10). All outside calls are injected so this is easy to test. */

export interface SubmitDeps {
  post(body: unknown): Promise<{ ok: true; data: any } | { ok: false; error: { code: string; message: string } }>;
  upload(bucket: 'photos' | 'videos', path: string, file: Blob): Promise<{ error: string | null }>;
  onProgress(done: number, total: number): void;
}

export interface SubmitInput {
  clientKey: string;
  draft: FormDraft;
  photos: Blob[];
  video: Blob;
}

export type SubmitResult =
  | { ok: true; status: string; submittedAt: string | null }
  | { ok: false; code: string; message: string; retry: boolean };

export const UPLOAD_STOPPED = 'Upload stopped. Tap Try again.';

export function listingBody(draft: FormDraft) {
  const clean = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    region: draft.region,
    category: draft.category,
    title: draft.title.trim(),
    description: draft.description.trim(),
    price_ngn: Number(priceDigits(draft.price)),
    condition_age: draft.condition_age,
    condition_work: draft.condition_work,
    brand: clean(draft.brand),
    model: clean(draft.model),
    size: clean(draft.size),
  };
}

/**
 * Create the draft, upload each file one at a time, then submit.
 * Safe to run again after any failure: the same client_key finds the same draft, and uploads replace files in place.
 */
export async function submitListing(deps: SubmitDeps, input: SubmitInput): Promise<SubmitResult> {
  const listing = listingBody(input.draft);
  const total = input.photos.length + 1;
  deps.onProgress(0, total);

  const first = await deps.post({
    client_key: input.clientKey,
    submit: false,
    listing,
    media_plan: { photo_count: input.photos.length, has_video: true },
  });
  if (!first.ok) return { ok: false, code: first.error.code, message: first.error.message, retry: retryable(first.error.code) };
  if (!first.data.upload) {
    // Already sent earlier (for example a double tap or a reopened tab). Nothing more to do.
    return { ok: true, status: first.data.status, submittedAt: null };
  }

  const { photos, video } = first.data.upload as { photos: string[]; video: string };
  let done = 0;
  for (let i = 0; i < input.photos.length; i++) {
    const r = await deps.upload('photos', photos[i], input.photos[i]);
    if (r.error) return { ok: false, code: 'upload_failed', message: UPLOAD_STOPPED, retry: true };
    deps.onProgress(++done, total);
  }
  const rv = await deps.upload('videos', video, input.video);
  if (rv.error) return { ok: false, code: 'upload_failed', message: UPLOAD_STOPPED, retry: true };
  deps.onProgress(++done, total);

  const last = await deps.post({
    client_key: input.clientKey,
    submit: true,
    listing,
    media: { photo_paths: photos, video_path: video },
  });
  if (!last.ok) return { ok: false, code: last.error.code, message: last.error.message, retry: retryable(last.error.code) };
  return { ok: true, status: last.data.status, submittedAt: last.data.submitted_at ?? null };
}

/** Codes where trying the same thing again can work. Daily limit, blocked, name and sign-in problems need a different action. */
function retryable(code: string): boolean {
  return ['network', 'internal_error', 'rate_limited', 'validation_failed', 'upload_failed'].includes(code);
}
