import { z } from 'zod';
import { ApiError, mapDbError } from '@/lib/api/errors';
import { AGES, CATEGORIES, WORKING } from '@/lib/listing/schema';

/** Server rules for the edit page (PRD 6.4, doc 07 sections 3.5 and 3.9). The token is the only credential. */

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const vals = <T extends readonly { value: string }[]>(l: T) => l.map((x) => x.value) as [T[number]['value'], ...T[number]['value'][]];
const optText = z.string().trim().max(60).nullable();

export const tokenSchema = z.string().refine((t) => UUID_V4.test(t), 'bad token');

export const uploadUrlSchema = z.object({
  token: z.string(),
  photo_count: z.number().int().min(0).max(6),
  has_video: z.boolean(),
});

export const resubmitSchema = z.object({
  token: z.string(),
  listing: z
    .object({
      category: z.enum(vals(CATEGORIES)).optional(),
      title: z.string().trim().min(3).max(80).optional(),
      description: z.string().trim().min(10).max(1000).optional(),
      price_ngn: z.number().int().min(1).max(1_000_000_000).optional(),
      condition_age: z.enum(vals(AGES)).optional(),
      condition_work: z.enum(vals(WORKING)).optional(),
      brand: optText.optional(),
      model: optText.optional(),
      size: optText.optional(),
      photo_paths: z.array(z.string().max(200)).min(1).max(6),
      video_path: z.string().min(1).max(200),
    }),
});

export interface EditListing {
  listing_id: string;
  seller_id: string;
  region: string;
  category: string;
  title: string;
  description: string;
  price_ngn: number | string;
  condition_age: string;
  condition_work: string;
  brand: string | null;
  model: string | null;
  size: string | null;
  photo_urls: string[];
  video_url: string | null;
  rejection_reason: string | null;
  expires_at: string;
}

export interface EditDeps {
  /** get_listing_for_edit: checks the token without using it up. */
  getForEdit(hash: string): Promise<{ data: EditListing | null; error: { code?: string; message?: string } | null }>;
  resubmitCount(listingId: string): Promise<number>;
  signedUpload(bucket: 'photos' | 'videos', path: string): Promise<{ signedUrl: string; token: string } | null>;
  listFiles(bucket: 'photos' | 'videos', folder: string): Promise<string[]>;
  resubmit(hash: string, fields: Record<string, unknown>): Promise<{ id: string | null; error: { code?: string; message?: string } | null }>;
  hash(token: string): string;
}

export function checkToken(token: string): void {
  if (!tokenSchema.safeParse(token).success) throw new ApiError('token_invalid');
}

/** Valid token and a rejected listing, or an ApiError with the plain message for the seller. */
export async function loadForEdit(deps: EditDeps, token: string): Promise<EditListing> {
  checkToken(token);
  const { data, error } = await deps.getForEdit(deps.hash(token));
  if (error) throw mapDbError(error) ?? new ApiError('internal_error');
  if (!data) throw new ApiError('token_invalid');
  return data;
}

export const newPhotoPath = (folder: string, round: number, i: number) => `${folder}/r${round}-${i}.webp`;
export const newVideoPath = (folder: string, round: number) => `${folder}/r${round}-video.mp4`;
const folderOf = (l: EditListing) => `${l.seller_id}/${l.listing_id}`;

export async function uploadUrls(deps: EditDeps, body: z.infer<typeof uploadUrlSchema>) {
  const l = await loadForEdit(deps, body.token);
  const round = (await deps.resubmitCount(l.listing_id)) + 1;
  const folder = folderOf(l);
  const sign = async (bucket: 'photos' | 'videos', path: string) => {
    const s = await deps.signedUpload(bucket, path);
    if (!s) throw new ApiError('internal_error');
    return { path, signed_url: s.signedUrl, token: s.token };
  };
  const photos = await Promise.all(Array.from({ length: body.photo_count }, (_, i) => sign('photos', newPhotoPath(folder, round, i + 1))));
  const video = body.has_video ? await sign('videos', newVideoPath(folder, round)) : null;
  return { photos, video, expires_in_seconds: 7200 };
}

/** A path is allowed if it is a file the listing already has, or a new file made by this round of uploads. */
export async function resubmit(deps: EditDeps, body: z.infer<typeof resubmitSchema>) {
  const l = await loadForEdit(deps, body.token);
  const round = (await deps.resubmitCount(l.listing_id)) + 1;
  const folder = folderOf(l);
  const { photo_paths, video_path, ...text } = body.listing;

  const okPhoto = (p: string) =>
    l.photo_urls.includes(p) || new RegExp(`^${folder.replace(/[/]/g, '\\/')}\\/r${round}-[1-6]\\.webp$`).test(p);
  const okVideo = (p: string) => p === l.video_url || p === newVideoPath(folder, round);
  if (!photo_paths.every(okPhoto) || new Set(photo_paths).size !== photo_paths.length || !okVideo(video_path)) {
    throw new ApiError('invalid_media_path');
  }

  // New files must really be uploaded before the token is used up.
  const newPhotos = photo_paths.filter((p) => !l.photo_urls.includes(p)).map((p) => p.slice(folder.length + 1));
  const newVideo = video_path !== l.video_url;
  const [haveP, haveV] = await Promise.all([
    newPhotos.length ? deps.listFiles('photos', folder) : Promise.resolve([] as string[]),
    newVideo ? deps.listFiles('videos', folder) : Promise.resolve([] as string[]),
  ]);
  if (newPhotos.some((n) => !haveP.includes(n)) || (newVideo && !haveV.includes(video_path.slice(folder.length + 1)))) {
    throw new ApiError('validation_failed', 'Upload stopped. Tap Try again.', { fields: [{ field: 'media', reason: 'upload_incomplete' }] });
  }

  const fields: Record<string, unknown> = { ...text, photo_urls: photo_paths, video_url: video_path };
  const { id, error } = await deps.resubmit(deps.hash(body.token), fields);
  if (error) throw mapDbError(error) ?? new ApiError('internal_error');
  if (!id) throw new ApiError('internal_error');
  return { listing_id: id, status: 'pending_review' as const };
}
