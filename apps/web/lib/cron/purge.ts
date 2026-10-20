import { timingSafeEqual } from 'node:crypto';
import { ApiError } from '@/lib/api/errors';

/** Daily draft cleanup (doc 07 section 3.12). */

export function isCronAuthorized(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export interface PurgeDeps {
  /** purge_stale_drafts(days): deletes old drafts and returns each storage folder like "<seller>/<listing>/". */
  purgeRows(days: number): Promise<string[]>;
  /** Removes every file in a folder from both buckets. Returns how many files went. */
  removeFolder(folder: string): Promise<number>;
}

export const STALE_DAYS = 7;

export async function purgeDrafts(deps: PurgeDeps, header: string | null, secret: string) {
  if (!isCronAuthorized(header, secret)) throw new ApiError('unauthenticated');
  const folders = await deps.purgeRows(STALE_DAYS);
  let files = 0;
  for (const f of folders) {
    try { files += await deps.removeFolder(f.replace(/\/+$/, '')); } catch { /* the row is gone; leftover files are tidied by the next run's folder listing */ }
  }
  return { purged: folders.length, files_removed: files };
}
