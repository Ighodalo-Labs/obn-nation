import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';

/** Claim or approve a listing (PRD AD-4, AD-7). The database functions decide who may do it and who was first. */
export const decideSchema = z.object({
  listing_id: z.string().uuid(),
  action: z.enum(['claim', 'approve']),
});
export type DecideBody = z.infer<typeof decideSchema>;

export const JUST_HANDLED = 'This listing was just handled by someone else.';

export interface DecideDeps {
  /** Calls claim_listing or approve_listing as the signed-in admin. Returns the database error, if any. */
  call(fn: 'claim_listing' | 'approve_listing', listingId: string): Promise<{ code?: string; message?: string } | null>;
}

export async function decide(deps: DecideDeps, body: DecideBody): Promise<{ listing_id: string; action: string }> {
  const err = await deps.call(body.action === 'claim' ? 'claim_listing' : 'approve_listing', body.listing_id);
  if (err) {
    switch (err.code) {
      case 'OB005': // someone else already claimed it
      case '55000': // it is no longer waiting for review
        throw new ApiError('already_claimed', JUST_HANDLED);
      case '42501': throw new ApiError('not_authorized');
      case 'P0002': throw new ApiError('listing_not_found');
      default: throw new ApiError('internal_error');
    }
  }
  return { listing_id: body.listing_id, action: body.action };
}
