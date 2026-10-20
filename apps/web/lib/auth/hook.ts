import { Webhook } from 'standardwebhooks';

export interface HookPayload {
  user: { id: string; phone: string };
  sms: { otp: string };
}

export class HookRefused extends Error {}

/** Checks the standard-webhooks signature Supabase puts on the Send SMS hook call. Throws if it is wrong. */
export function verifyHook(secret: string, rawBody: string, headers: Headers): HookPayload {
  const key = secret.replace(/^v1,whsec_/, '');
  const wh = new Webhook(key);
  const plain = Object.fromEntries(headers.entries());
  const payload = wh.verify(rawBody, plain) as Partial<HookPayload>;
  if (!payload?.user?.phone || !payload?.sms?.otp) throw new HookRefused('payload is missing fields');
  return payload as HookPayload;
}

/** Supabase sends the phone without "+". We always work with E.164. */
export function toE164(phone: string): string {
  return phone.startsWith('+') ? phone : `+${phone}`;
}

export interface HookDeps {
  isBlacklisted(phone: string): Promise<boolean>;
  deliver(phone: string, code: string): Promise<{ status: 'sent' } | { status: 'failed'; reason: string }>;
}

/** Returns normally when the code was sent. Throws HookRefused when it was not. Nothing here logs the code. */
export async function processHook(deps: HookDeps, payload: HookPayload): Promise<void> {
  const phone = toE164(payload.user.phone);
  if (await deps.isBlacklisted(phone)) throw new HookRefused('blacklisted');
  const result = await deps.deliver(phone, payload.sms.otp);
  if (result.status !== 'sent') throw new HookRefused(result.reason);
}
