import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { AGES, CATEGORIES, REGIONS, WORKING } from './schema';

/** Server rules for POST /api/listings/create (doc 07 section 3.3). No framework imports, so it is easy to test. */

const vals = <T extends readonly { value: string }[]>(l: T) => l.map((x) => x.value) as [T[number]['value'], ...T[number]['value'][]];
const optText = z.string().trim().min(1).max(60).nullable().optional();

const listingFields = z.object({
  region: z.enum(vals(REGIONS)),
  category: z.enum(vals(CATEGORIES)),
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().min(10).max(1000),
  price_ngn: z.number().int().min(1).max(1_000_000_000),
  condition_age: z.enum(vals(AGES)),
  condition_work: z.enum(vals(WORKING)),
  brand: optText,
  model: optText,
  size: optText,
});

export const createBodySchema = z.discriminatedUnion('submit', [
  z.object({
    client_key: z.string().uuid(),
    submit: z.literal(false),
    listing: listingFields,
    media_plan: z.object({ photo_count: z.number().int().min(1).max(6), has_video: z.literal(true, { errorMap: () => ({ message: 'A video is required.' }) }) }),
  }),
  z.object({
    client_key: z.string().uuid(),
    submit: z.literal(true),
    listing: listingFields,
    media: z.object({
      photo_paths: z.array(z.string().max(200)).min(1).max(6),
      video_path: z.string().max(200, 'A video is required.'),
    }),
  }),
]);
export type CreateBody = z.infer<typeof createBodySchema>;
export type ListingFields = z.infer<typeof listingFields>;

export interface ListingRow {
  id: string;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  submitted_at: string | null;
}

export interface CreateDeps {
  findByKey(sellerId: string, clientKey: string): Promise<ListingRow | null>;
  insertDraft(row: { seller_id: string; client_key: string; ref_code: string | null } & ListingFields): Promise<ListingRow>;
  updateDraft(id: string, fields: ListingFields): Promise<void>;
  /** Files that exist in the seller's folder for this listing: names only, like "1.webp". */
  listFiles(bucket: 'photos' | 'videos', folder: string): Promise<string[]>;
  /** Moves a draft to pending_review. Returns null if it was no longer a draft. */
  submitDraft(id: string, fields: ListingFields, photoPaths: string[], videoPath: string): Promise<ListingRow | null>;
}

export const photoName = (n: number) => `${n}.webp`;
export const VIDEO_NAME = 'video.mp4';
export const folderOf = (sellerId: string, listingId: string) => `${sellerId}/${listingId}`;

const cleanFields = (f: ListingFields): ListingFields => ({
  ...f,
  brand: f.brand ?? null,
  model: f.model ?? null,
  size: f.size ?? null,
});

export async function createOrSubmit(deps: CreateDeps, sellerId: string, refCode: string | null, body: CreateBody) {
  const fields = cleanFields(body.listing);
  let row = await deps.findByKey(sellerId, body.client_key);

  if (!body.submit) {
    let created = false;
    if (!row) {
      row = await deps.insertDraft({ seller_id: sellerId, client_key: body.client_key, ref_code: refCode, ...fields });
      created = true;
    } else if (row.status === 'draft') {
      await deps.updateDraft(row.id, fields); // a retry may carry corrected text
    }
    const body201 = { listing_id: row.id, status: row.status, created, upload: null as null | { photos: string[]; video: string } };
    if (row.status === 'draft') {
      const folder = folderOf(sellerId, row.id);
      const plan = body.media_plan;
      body201.upload = {
        photos: Array.from({ length: plan.photo_count }, (_, i) => `${folder}/${photoName(i + 1)}`),
        video: `${folder}/${VIDEO_NAME}`,
      };
    }
    return { status: created ? 201 : 200, body: body201 };
  }

  if (!row) throw new ApiError('listing_not_found');
  if (row.status === 'pending_review' || row.status === 'approved') {
    return { status: 200, body: { listing_id: row.id, status: row.status, submitted_at: row.submitted_at, already_submitted: true } };
  }
  if (row.status !== 'draft') throw new ApiError('invalid_state');

  const folder = folderOf(sellerId, row.id);
  const { photo_paths, video_path } = body.media;
  const okPhoto = photo_paths.every((p, i) => p === `${folder}/${photoName(i + 1)}`);
  if (!okPhoto || video_path !== `${folder}/${VIDEO_NAME}`) throw new ApiError('invalid_media_path');

  // Every file must really be there. A half-finished upload must not be submitted.
  const [photos, videos] = await Promise.all([
    deps.listFiles('photos', folder),
    deps.listFiles('videos', folder),
  ]);
  const missingPhoto = photo_paths.some((_, i) => !photos.includes(photoName(i + 1)));
  const missingVideo = !videos.includes(VIDEO_NAME);
  if (missingPhoto || missingVideo) {
    throw new ApiError('validation_failed', 'Upload stopped. Tap Try again.', { fields: [{ field: 'media', reason: 'upload_incomplete' }] });
  }

  const done = await deps.submitDraft(row.id, fields, photo_paths, video_path);
  if (!done) {
    const again = await deps.findByKey(sellerId, body.client_key); // someone (a double tap) got there first
    if (again && again.status !== 'draft') {
      return { status: 200, body: { listing_id: again.id, status: again.status, submitted_at: again.submitted_at, already_submitted: true } };
    }
    throw new ApiError('invalid_state');
  }
  return { status: 200, body: { listing_id: done.id, status: done.status, submitted_at: done.submitted_at } };
}
