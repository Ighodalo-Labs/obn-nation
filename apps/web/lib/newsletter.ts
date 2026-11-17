import { z } from 'zod';
import { normalizeNgPhone } from '@/lib/phone';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** What the sign-up form sends. `company` is a hidden trap field: people leave it empty, bots fill it. */
export const subscribeBody = z.object({
  wantsEmail: z.boolean(),
  wantsSms: z.boolean(),
  email: z.string().trim().max(254).optional().default(''),
  phone: z.string().trim().max(30).optional().default(''),
  consent: z.boolean(),
  company: z.string().max(200).optional().default(''),
});

export type Subscription =
  | { kind: 'ignore' }
  | { kind: 'store'; email: string | null; phone: string | null; wantsEmail: boolean; wantsSms: boolean }
  | { kind: 'invalid'; field: 'choice' | 'email' | 'phone' | 'consent'; message: string };

/** Pure rules, so they can be tested without a database. */
export function readSubscription(input: z.infer<typeof subscribeBody>): Subscription {
  if (input.company.trim() !== '') return { kind: 'ignore' };
  if (!input.wantsEmail && !input.wantsSms) return { kind: 'invalid', field: 'choice', message: 'Choose Email, SMS, or both.' };
  const email = input.email.toLowerCase();
  if (input.wantsEmail && !EMAIL.test(email)) return { kind: 'invalid', field: 'email', message: 'Enter a valid email address.' };
  const phone = input.wantsSms ? normalizeNgPhone(input.phone) : null;
  if (input.wantsSms && !phone) return { kind: 'invalid', field: 'phone', message: 'Enter a Nigerian phone number, for example 0803 123 4567.' };
  if (!input.consent) return { kind: 'invalid', field: 'consent', message: 'Please tick the box to agree.' };
  return { kind: 'store', email: input.wantsEmail ? email : null, phone, wantsEmail: input.wantsEmail, wantsSms: input.wantsSms };
}

/** Small per-address limit: 5 sign-ups an hour. Kept in memory, so it slows a bot down, it is not a hard wall. */
const hits = new Map<string, number[]>();
export function tooMany(key: string, now = Date.now(), limit = 5, windowMs = 3_600_000): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) { hits.set(key, recent); return true; }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return false;
}
