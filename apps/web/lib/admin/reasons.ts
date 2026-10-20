export const REASON_CHIPS = ['Photos are blurry', 'Price looks too high', 'Item not allowed', 'Missing details'] as const;

export function validateReason(raw: string): { ok: true; reason: string } | { ok: false; message: string } {
  const reason = raw.replace(/\s+/g, ' ').trim();
  if (reason.length < 5) return { ok: false, message: 'Please write a reason of at least 5 characters.' };
  if (reason.length > 500) return { ok: false, message: 'Please keep the reason under 500 characters.' };
  return { ok: true, reason };
}
