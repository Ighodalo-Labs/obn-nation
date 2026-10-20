import { ApiError } from '@/lib/api/errors';
import { normalizeNgPhone } from '@/lib/phone';
import { safeNext } from '@/lib/middleware/rules';

export const OTP_TTL_SECONDS = 600;
export const OTP_RESEND_SECONDS = 60;

interface AuthFailure {
  status?: number;
  code?: string;
}

export interface ProfileRow {
  role: 'seller' | 'regional_admin' | 'global_admin';
  region: string | null;
  fullName: string;
  isActive: boolean;
  isBlacklisted: boolean;
}

/** Everything the sign-in flow needs from the outside. Real versions are in the route files; tests pass fakes. */
export interface OtpDeps {
  isBlacklisted(phone: string): Promise<boolean>;
  markSent(phone: string): Promise<void>;
  state(phone: string): Promise<{ triesLeft: number; expired: boolean }>;
  registerWrong(phone: string): Promise<number>;
  clear(phone: string): Promise<void>;
  signInWithOtp(phone: string): Promise<{ error: AuthFailure | null }>;
  verifyOtp(phone: string, code: string): Promise<{ userId: string | null; error: AuthFailure | null }>;
  loadProfile(userId: string): Promise<ProfileRow | null>;
  signOut(): Promise<void>;
}

function triesMessage(left: number): string {
  return `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.`;
}

export async function sendCode(deps: OtpDeps, rawPhone: string) {
  const phone = normalizeNgPhone(rawPhone);
  if (!phone) throw new ApiError('invalid_phone', undefined, { field: 'phone' });
  if (await deps.isBlacklisted(phone)) throw new ApiError('phone_blocked');

  const { error } = await deps.signInWithOtp(phone);
  if (error) {
    if (error.status === 429 || error.code === 'over_sms_send_rate_limit' || error.code === 'over_request_rate_limit') {
      throw new ApiError('rate_limited', `Please wait ${OTP_RESEND_SECONDS} seconds before asking for a new code.`, {
        retry_after_seconds: OTP_RESEND_SECONDS,
      });
    }
    throw new ApiError('whatsapp_unavailable');
  }
  await deps.markSent(phone);
  return { sent: true, phone, resend_after_seconds: OTP_RESEND_SECONDS, expires_in_seconds: OTP_TTL_SECONDS };
}

export async function verifyCode(deps: OtpDeps, rawPhone: string, code: string, rawNext?: string | null) {
  const phone = normalizeNgPhone(rawPhone);
  if (!phone) throw new ApiError('invalid_phone', undefined, { field: 'phone' });
  if (await deps.isBlacklisted(phone)) throw new ApiError('phone_blocked');

  const state = await deps.state(phone);
  if (state.expired) throw new ApiError('code_expired');
  if (state.triesLeft <= 0) throw new ApiError('too_many_attempts', undefined, { retry_after_seconds: 0 });

  const { userId, error } = await deps.verifyOtp(phone, code);
  if (error || !userId) {
    const left = await deps.registerWrong(phone);
    if (left <= 0) throw new ApiError('too_many_attempts', undefined, { retry_after_seconds: 0 });
    throw new ApiError('invalid_code', triesMessage(left), { tries_left: left });
  }

  const profile = await deps.loadProfile(userId);
  if (!profile) {
    await deps.signOut();
    throw new ApiError('internal_error');
  }
  if (profile.isBlacklisted) {
    await deps.signOut();
    throw new ApiError('phone_blocked');
  }
  const isAdmin = profile.role !== 'seller';
  if (isAdmin && !profile.isActive) {
    await deps.signOut();
    throw new ApiError('account_blocked');
  }
  await deps.clear(phone);

  const nextPath = isAdmin ? (safeNext(rawNext) ?? '/admin/dashboard') : '/list/form';
  return {
    user: { id: userId, role: profile.role, region: profile.region, needs_name: profile.fullName.trim().length < 2 },
    next: nextPath,
  };
}
