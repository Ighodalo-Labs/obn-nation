import type { ServerEnv } from '@/lib/env';
import { maskPhone } from '@/lib/phone';
import { sendRejectionNotice, type SendResult } from '@/lib/whatsapp';

/**
 * Delivers the rejection notice with the edit link on WhatsApp.
 * Stub mode sends nothing and never logs the link or the reason.
 */
export async function deliverRejection(
  env: ServerEnv,
  phone: string,
  details: { firstName: string; title: string; reason: string; link: string },
): Promise<SendResult> {
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
