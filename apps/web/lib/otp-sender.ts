import type { ServerEnv } from '@/lib/env';
import { maskPhone } from '@/lib/phone';
import { sendOtp, type SendResult } from '@/lib/whatsapp';

/**
 * Delivers the sign-in code on WhatsApp.
 * Stub mode sends nothing and never logs the code. Live mode uses the approved authentication template.
 */
export async function deliverOtp(env: ServerEnv, phone: string, code: string): Promise<SendResult> {
  if (env.WHATSAPP_MODE === 'stub') {
    console.info(`[whatsapp:stub] sign-in code requested for ${maskPhone(phone)}; nothing sent`);
    return { status: 'sent', sid: 'stub' };
  }
  return sendOtp(
    {
      accountSid: env.TWILIO_ACCOUNT_SID!,
      authToken: env.TWILIO_AUTH_TOKEN!,
      from: env.TWILIO_WHATSAPP_FROM!,
      otpContentSid: env.TWILIO_OTP_CONTENT_SID!,
      rejectionContentSid: env.TWILIO_REJECT_CONTENT_SID!,
    },
    phone,
    code,
  );
}
