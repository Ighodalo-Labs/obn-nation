import type { ServerEnv } from '@/lib/env';
import { maskPhone } from '@/lib/phone';
import { deliverTelegram, rejectionText, type ChatLookup } from '@/lib/telegram';
import { sendRejectionNotice, type SendResult } from '@/lib/whatsapp';

/** Real lookup, loaded only when the channel is Telegram. */
const realLookup: ChatLookup = async (phone) => (await import('@/lib/telegram-deps')).chatIdForPhone(phone);

/**
 * Delivers the rejection notice with the edit link on the chosen channel (Telegram or WhatsApp, doc 11).
 * Stub mode sends nothing and never logs the link or the reason.
 */
export async function deliverRejection(
  env: ServerEnv,
  phone: string,
  details: { firstName: string; title: string; reason: string; link: string },
  chatFor: ChatLookup = realLookup,
): Promise<SendResult> {
  if (env.NEXT_PUBLIC_MESSAGE_CHANNEL === 'telegram') return deliverTelegram(env, phone, rejectionText(details), chatFor);
  if (env.WHATSAPP_MODE === 'stub') {
    console.info(`[whatsapp:stub] rejection notice for ${maskPhone(phone)}; nothing sent`);
    return { status: 'sent', sid: 'stub' };
  }
  return sendRejectionNotice(
    {
      accountSid: env.TWILIO_ACCOUNT_SID!,
      authToken: env.TWILIO_AUTH_TOKEN!,
      from: env.TWILIO_WHATSAPP_FROM!,
      otpContentSid: env.TWILIO_OTP_CONTENT_SID!,
      rejectionContentSid: env.TWILIO_REJECT_CONTENT_SID!,
    },
    phone,
    details,
  );
}
