import { z } from 'zod';
import { ApiError, mapDbError } from '@/lib/api/errors';
import { normalizeNgPhone } from '@/lib/phone';
import { REGIONS } from '@/lib/listing/schema';

/** Global Admin actions (PRD 6.7, doc 07 sections 3.6 and 3.10). The database functions re-check the caller every time. */

export type DbError = { code?: string; message?: string } | null;

const reason = z
  .string()
  .transform((s) => s.replace(/\s+/g, ' ').trim())
  .pipe(z.string().min(5, 'Please write a reason of at least 5 characters.').max(500, 'Please keep the reason under 500 characters.'));
const uuid = z.string().uuid();
const regionValues = REGIONS.map((r) => r.value) as [string, ...string[]];

export const createAdminSchema = z
  .object({
    phone: z.string().min(1).max(30),
    full_name: z.string().transform((s) => s.replace(/\s+/g, ' ').trim()).pipe(z.string().min(2, 'Add the name.').max(80)),
    role: z.enum(['regional_admin', 'global_admin']),
    region: z.enum(regionValues).nullable().optional(),
  })
  .refine((v) => v.role === 'global_admin' || Boolean(v.region), { message: 'Choose a region for a regional admin.', path: ['region'] });
export const statusSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('revoke'), profile_id: uuid, reason }),
  z.object({ action: z.literal('reinstate'), profile_id: uuid }),
]);
export const blacklistSchema = z.object({ profile_id: uuid, reason });
export const reassignSchema = z.object({ listing_id: uuid, new_admin_id: uuid, reason });

/** Database errors, with the wording Global Admins need. */
export function adminError(e: DbError): ApiError {
  const msg = e?.message ?? '';
  if (msg.includes('blacklisted')) return new ApiError('phone_blacklisted', 'This admin is blacklisted. That cannot be undone.');
  if (msg.includes('invalid_target_admin')) return new ApiError('validation_failed', 'Choose an active admin of the same region, or a Global Admin.');
  if (msg.includes('region_required')) return new ApiError('validation_failed', 'Choose a region for a regional admin.');
  if (e?.code === 'OB006') return new ApiError('already_admin');
  return mapDbError(e) ?? new ApiError('internal_error');
}

export interface ProfileLite { id: string; role: string; is_blacklisted: boolean; full_name: string }

export interface GlobalDeps {
  findProfileByPhone(phone: string): Promise<ProfileLite | null>;
  /** Makes the login (phone already confirmed) and returns its id. The profile row is created by a database trigger. */
  createLogin(phone: string): Promise<string>;
  setName(profileId: string, name: string): Promise<void>;
  /** Run as the signed-in Global Admin, so the database checks the role. */
  promote(profileId: string, role: string, region: string | null): Promise<{ code: string | null; error: DbError }>;
  revoke(profileId: string, reason: string): Promise<DbError>;
  reinstate(profileId: string): Promise<DbError>;
  reassign(listingId: string, newAdmin: string, reason: string): Promise<DbError>;
  /** blacklist_admin with the service role and the verified caller as actor. */
  blacklist(actor: string, profileId: string, reason: string): Promise<DbError>;
  banLogin(profileId: string): Promise<boolean>;
}

export async function createAdmin(deps: GlobalDeps, body: z.infer<typeof createAdminSchema>) {
  const phone = normalizeNgPhone(body.phone);
  if (!phone) throw new ApiError('invalid_phone');
  const profile = await deps.findProfileByPhone(phone);
  if (profile?.is_blacklisted) throw new ApiError('phone_blacklisted', 'This number is blacklisted and cannot be added.');
  if (profile && profile.role !== 'seller') throw new ApiError('already_admin');
  const id = profile?.id ?? (await deps.createLogin(phone));
  if (!profile || profile.full_name.trim().length < 2) await deps.setName(id, body.full_name);
  const region = body.role === 'regional_admin' ? body.region ?? null : null;
  const { code, error } = await deps.promote(id, body.role, region);
  if (error) throw adminError(error);
  return {
    profile_id: id,
    role: body.role,
    region,
    referral_code: code,
    referral_link: code ? `/list?ref=${code}` : null,
  };
}

export async function setStatus(deps: GlobalDeps, body: z.infer<typeof statusSchema>) {
  const error = body.action === 'revoke' ? await deps.revoke(body.profile_id, body.reason) : await deps.reinstate(body.profile_id);
  if (error) throw adminError(error);
  return { profile_id: body.profile_id, action: body.action };
}

export async function reassignListing(deps: GlobalDeps, body: z.infer<typeof reassignSchema>) {
  const error = await deps.reassign(body.listing_id, body.new_admin_id, body.reason);
  if (error) throw adminError(error);
  return { listing_id: body.listing_id, assigned_admin_id: body.new_admin_id };
}

export const BAN_WARNING = 'Blacklisted. Sign-in block is being retried. Repeat the request to retry.';

/** The database flag already blocks all data access; the Auth ban is a second lock. Repeating the request is safe. */
export async function blacklistAdmin(deps: GlobalDeps, actor: string, body: z.infer<typeof blacklistSchema>) {
  if (body.profile_id === actor) throw new ApiError('not_authorized', 'You cannot blacklist yourself.');
  const error = await deps.blacklist(actor, body.profile_id, body.reason);
  if (error) throw adminError(error);
  let banned = false;
  try { banned = await deps.banLogin(body.profile_id); } catch { banned = false; }
  return {
    profile_id: body.profile_id,
    is_blacklisted: true as const,
    auth_banned: banned,
    ...(banned ? {} : { warning: BAN_WARNING }),
  };
}
