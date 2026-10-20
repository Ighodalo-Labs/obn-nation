import { NextResponse } from 'next/server';
import { phoneIsBlacklisted } from '@/lib/auth/deps';
import { processHook, verifyHook } from '@/lib/auth/hook';
import { serverEnv } from '@/lib/env';
import { deliverOtp } from '@/lib/otp-sender';

export const runtime = 'nodejs';

/** Supabase "Send SMS" hook. Called by Supabase Auth only. Never logs the code. */
export async function POST(req: Request) {
  const refuse = () =>
    NextResponse.json({ error: { http_code: 400, message: 'Could not send the code.' } }, { status: 400 });
  try {
    const env = serverEnv();
    const raw = await req.text();
    const payload = verifyHook(env.SEND_SMS_HOOK_SECRET, raw, req.headers);
    await processHook({ isBlacklisted: phoneIsBlacklisted, deliver: (phone, code) => deliverOtp(env, phone, code) }, payload);
    return NextResponse.json({});
  } catch {
    return refuse();
  }
}
