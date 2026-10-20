/** API error codes, statuses and default messages. Mirrors doc 07 section 1.2. */
const TABLE = {
  invalid_phone: [400, 'Enter a Nigerian phone number, for example 0803 123 4567.'],
  invalid_code: [400, 'That code is not right.'],
  validation_failed: [400, 'Some fields need attention.'],
  unauthenticated: [401, 'Please sign in to continue.'],
  phone_blocked: [403, 'This number cannot be used on OBN NATION.'],
  account_blocked: [403, 'Your access has ended.'],
  not_authorized: [403, 'You are not allowed to do this.'],
  listing_not_found: [404, 'We could not find this listing.'],
  profile_not_found: [404, 'We could not find this profile.'],
  token_invalid: [404, 'This link is not valid.'],
  invalid_state: [409, 'This listing cannot be changed that way right now.'],
  already_claimed: [409, 'This listing was just handled by someone else.'],
  listing_locked: [409, 'This listing cannot be edited right now.'],
  already_admin: [409, 'This person is already an admin.'],
  phone_blacklisted: [409, 'This number is blacklisted.'],
  code_expired: [410, 'This code has expired. Ask for a new one.'],
  token_used: [410, 'This link was already used.'],
  token_expired: [410, 'This link has expired.'],
  token_revoked: [410, 'A newer link replaced this one.'],
  name_required: [422, 'Please add your name first.'],
  invalid_media_path: [422, 'A file is not in the right place.'],
  reason_required: [422, 'Please write a reason of at least 5 characters.'],
  rate_limited: [429, 'Too many requests. Please try again soon.'],
  too_many_attempts: [429, 'Too many wrong codes. Ask for a new one.'],
  daily_limit_reached: [429, "You have reached today's limit of 10 listings. Please come back tomorrow."],
  whatsapp_unavailable: [502, 'We could not send the code. Check your number and try again.'],
  internal_error: [500, 'Something went wrong on our side. Please try again.'],
} as const;

export type ApiCode = keyof typeof TABLE;

export class ApiError extends Error {
  readonly status: number;
  constructor(
    readonly code: ApiCode,
    message?: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message ?? TABLE[code][1]);
    this.name = 'ApiError';
    this.status = TABLE[code][0];
  }
}

export function newRequestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `req_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export function errorBody(err: ApiError, requestId: string) {
  return {
    error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    request_id: requestId,
  };
}

/** Turns a Postgres error into an ApiError (doc 07 section 1.3). Returns null if the error is not one we map. */
export function mapDbError(e: { code?: string; message?: string } | null | undefined): ApiError | null {
  if (!e?.code) return null;
  const msg = e.message ?? '';
  switch (e.code) {
    case '42501': return new ApiError('not_authorized');
    case 'P0002': return new ApiError('listing_not_found');
    case '55000': return new ApiError('invalid_state');
    case '55006': return new ApiError('listing_locked');
    case '23514':
      if (msg.includes('reason_required')) return new ApiError('reason_required');
      if (msg.includes('invalid_media_path')) return new ApiError('invalid_media_path');
      if (msg.includes('seller_name_required')) return new ApiError('name_required');
      return new ApiError('validation_failed');
    case '54000': return new ApiError('daily_limit_reached');
    case 'OB001': return new ApiError('token_invalid');
    case 'OB002': return new ApiError('token_used');
    case 'OB003': return new ApiError('token_expired');
    case 'OB004': return new ApiError('token_revoked');
    case 'OB005': return new ApiError('already_claimed');
    case 'OB006': return new ApiError('already_admin');
    default: return null;
  }
}
