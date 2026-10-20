import { z } from 'zod';
import { ApiError, mapDbError } from '@/lib/api/errors';

/** Reject a listing, or send a new edit link (doc 07 sections 3.4 and 3.8). The plain token lives only inside one request. */

export const rejectSchema = z.object({
  listing_id: z.string().uuid(),
  reason: z
    .string()
    .transform((s) => s.replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(5, 'Please write a reason of at least 5 characters.').max(500, 'Please keep the reason under 500 characters.')),
});
export const reissueSchema = z.object({ listing_id: z.string().uuid() });
export type RejectBody = z.infer<typeof rejectSchema>;

export type Notification = { status: 'sent'; twilio_sid: string } | { status: 'failed'; reason: string };

export interface SellerInfo { phone: string; fullName: string; title: string; reason: string }

export interface RejectDeps {
  newToken(): { hash: string; link: string };
  /** reject_listing or reissue_edit_link with the service role. Returns the link expiry. */
  saveRejection(actor: string, listingId: string, reason: string, hash: string): Promise<{ expiresAt: string | null; error: { code?: string; message?: string } | null }>;
  saveReissue(actor: string, listingId: string, hash: string): Promise<{ expiresAt: string | null; error: { code?: string; message?: string } | null }>;
  loadSeller(listingId: string): Promise<SellerInfo | null>;
  notify(phone: string, details: { firstName: string; title: string; reason: string; link: string }): Promise<{ status: 'sent'; sid: string } | { status: 'failed'; reason: string }>;
}

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? '';

async function finish(deps: RejectDeps, listingId: string, link: string, expiresAt: string | null) {
  let notification: Notification;
  try {
    const seller = await deps.loadSeller(listingId);
    if (!seller) {
      notification = { status: 'failed', reason: 'seller_not_found' };
    } else {
      const r = await deps.notify(seller.phone, { firstName: firstName(seller.fullName), title: seller.title, reason: seller.reason, link });
      notification = r.status === 'sent' ? { status: 'sent', twilio_sid: r.sid } : { status: 'failed', reason: r.reason };
    }
  } catch {
    notification = { status: 'failed', reason: 'send_error' }; // the rejection is already saved, so this is not an error response
  }
  return { listing_id: listingId, status: 'rejected' as const, edit_link_expires_at: expiresAt, notification };
}

export async function rejectListing(deps: RejectDeps, actor: string, body: RejectBody) {
  const t = deps.newToken();
  const saved = await deps.saveRejection(actor, body.listing_id, body.reason, t.hash);
  if (saved.error) throw mapDbError(saved.error) ?? new ApiError('internal_error');
  return finish(deps, body.listing_id, t.link, saved.expiresAt);
}

export async function reissueLink(deps: RejectDeps, actor: string, listingId: string) {
  const t = deps.newToken();
  const saved = await deps.saveReissue(actor, listingId, t.hash);
  if (saved.error) throw mapDbError(saved.error) ?? new ApiError('internal_error');
  return finish(deps, listingId, t.link, saved.expiresAt);
}
