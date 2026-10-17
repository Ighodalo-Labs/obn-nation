import twilio from 'twilio';

export type SendResult =
  | { status: 'sent'; sid: string }
  | { status: 'failed'; reason: string };

interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  /** Your approved WhatsApp sender, for example "+2348000000000". */
  from: string;
  /** Content SID of the approved authentication template (OTP). */
  otpContentSid: string;
  /** Content SID of the approved utility template (rejection notice). */
  rejectionContentSid: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WhatsAppConfig {
  const need = (key: string): string => {
    const value = env[key];
    if (!value) throw new Error(`Missing environment variable ${key}`);
    return value;
  };
  return {
    accountSid: need('TWILIO_ACCOUNT_SID'),
    authToken: need('TWILIO_AUTH_TOKEN'),
    from: need('TWILIO_WHATSAPP_FROM'),
    otpContentSid: need('TWILIO_OTP_CONTENT_SID'),
    rejectionContentSid: need('TWILIO_REJECT_CONTENT_SID'),
  };
}

/** WhatsApp template variables cannot contain line breaks or tabs, and long text gets cut. */
export function cleanVariable(value: string, max = 200): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

async function sendTemplate(
  config: WhatsAppConfig,
  toPhone: string,
  contentSid: string,
  variables: Record<string, string>,
): Promise<SendResult> {
  try {
    const client = twilio(config.accountSid, config.authToken);
    const message = await client.messages.create({
      from: `whatsapp:${config.from}`,
      to: `whatsapp:${toPhone}`,
      contentSid,
      contentVariables: JSON.stringify(variables),
    });
    return { status: 'sent', sid: message.sid };
  } catch (err) {
    // Log the Twilio error code only. Never log the message body, the code or the link.
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : 'unknown';
    return { status: 'failed', reason: `twilio_${code}` };
  }
}

/** Authentication template. Variable 1 is the 6-digit code. */
export function sendOtp(config: WhatsAppConfig, toPhone: string, code: string): Promise<SendResult> {
  return sendTemplate(config, toPhone, config.otpContentSid, { '1': code });
}

/** Utility template for a rejected listing. Variables: 1 first name, 2 item title, 3 reason, 4 edit link. */
export function sendRejectionNotice(
  config: WhatsAppConfig,
  toPhone: string,
  details: { firstName: string; title: string; reason: string; link: string },
): Promise<SendResult> {
  return sendTemplate(config, toPhone, config.rejectionContentSid, {
    '1': cleanVariable(details.firstName || 'there', 40),
    '2': cleanVariable(details.title, 80),
    '3': cleanVariable(details.reason, 300),
    '4': details.link,
  });
}
