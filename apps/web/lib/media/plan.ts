import { IMAGE_MAX_COUNT } from '@/lib/compression/images';

/** Decides which of the chosen photos fit into the six slots (PRD FM-3, error table). Pure, so it is easy to test. */
export function planPhotoBatch<T>(existingCount: number, chosen: T[]): { accepted: T[]; overflow: number } {
  const room = Math.max(0, IMAGE_MAX_COUNT - existingCount);
  return { accepted: chosen.slice(0, room), overflow: Math.max(0, chosen.length - room) };
}

export const TOO_MANY_PHOTOS = `You can add up to ${IMAGE_MAX_COUNT} photos.`;

/** "412 KB", "2.4 MB". */
export function humanSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Message for an error we did not expect, such as a full phone. */
export function friendlyMediaError(e: unknown, fallback: string): string {
  if (e instanceof Error && 'code' in e && typeof (e as { code: unknown }).code === 'string' && e.message) return e.message;
  if (e instanceof DOMException && e.name === 'QuotaExceededError') return 'Your phone has no space left.';
  return fallback;
}
