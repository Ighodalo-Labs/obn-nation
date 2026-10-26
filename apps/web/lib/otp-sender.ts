import type { ServerEnv } from '@/lib/env';
import { maskPhone } from '@/lib/phone';
import { deliverTelegram, otpText, type ChatLookup } from '@/lib/telegram';
import { sendOtp, type SendResult } from '@/lib/whatsapp';

/** Real lookup, loaded only when the channel is Telegram. */
const realLookup: ChatLookup = async (phone) => (await import('@/lib/telegram-deps')).chatIdForPhone(phone);

/**
 * Delivers the sign-in code on the chosen channel (Telegram or WhatsApp, doc 11).
 * Stub mode sends nothing and never logs the code. Live mode uses the approved authentication template.
 */
export async function deliverOtp(env: ServerEnv, phone: string, code: string, chatFor: ChatLookup = realLookup): Promise<SendResult> {
  if (env.NEXT_PUBLIC_MESSAGE_CHANNEL === 'telegram') return deliverTelegram(env, phone, otpText(code), chatFor);
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
