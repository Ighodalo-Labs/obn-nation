import 'server-only';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import type { OtpDeps, ProfileRow } from './otp';

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`database call failed: ${res.error.message}`);
  return res.data;
}

export async function phoneIsBlacklisted(phone: string): Promise<boolean> {
  const admin = createAdminSupabase();
  const rows = must(await admin.from('profiles').select('id').eq('phone', phone).eq('is_blacklisted', true).limit(1));
  return (rows ?? []).length > 0;
}

/** Real dependencies for the sign-in flow. Used only inside route handlers. */
export function buildOtpDeps(): OtpDeps {
  const admin = createAdminSupabase();
  const session = createServerSupabase();
  return {
    isBlacklisted: phoneIsBlacklisted,
    markSent: async (phone) => void must(await admin.rpc('otp_mark_sent', { p_phone: phone })),
    state: async (phone) => {
      const rows = must(await admin.rpc('otp_state', { p_phone: phone })) as { tries_left: number; expired: boolean }[];
      return { triesLeft: rows[0]?.tries_left ?? 0, expired: rows[0]?.expired ?? true };
    },
    registerWrong: async (phone) => Number(must(await admin.rpc('otp_register_wrong', { p_phone: phone }))),
    clear: async (phone) => void must(await admin.rpc('otp_clear', { p_phone: phone })),
    signInWithOtp: async (phone) => {
      const { error } = await session.auth.signInWithOtp({ phone });
      return { error: error ? { status: error.status, code: error.code } : null };
    },
    verifyOtp: async (phone, code) => {
      const { data, error } = await session.auth.verifyOtp({ phone, token: code, type: 'sms' });
      return { userId: data?.user?.id ?? null, error: error ? { status: error.status, code: error.code } : null };
    },
    loadProfile: async (userId): Promise<ProfileRow | null> => {
      const row = must(
        await admin.from('profiles').select('role, region, full_name, is_active, is_blacklisted').eq('id', userId).maybeSingle(),
      );
      if (!row) return null;
      return {
        role: row.role,
        region: row.region,
        fullName: row.full_name,
        isActive: row.is_active,
        isBlacklisted: row.is_blacklisted,
      };
    },
    signOut: async () => void (await session.auth.signOut()),
  };
}
