/**
 * Normalises a Nigerian mobile number to E.164 (+234 and 10 digits starting 7, 8 or 9).
 * Accepts 0803…, 803…, 234803…, +234803… and +2340803…, with spaces, dashes or brackets.
 * Returns null for anything else (PRD SI-1).
 */
export function normalizeNgPhone(input: string): string | null {
  const s = input.replace(/[\s\-().]/g, '');
  let national: string | undefined;
  if (/^\+?2340\d{10}$/.test(s)) national = s.replace(/^\+?2340/, '');
  else if (/^\+?234\d{10}$/.test(s)) national = s.replace(/^\+?234/, '');
  else if (/^0\d{10}$/.test(s)) national = s.slice(1);
  else if (/^\d{10}$/.test(s)) national = s;
  if (!national || !/^[789]\d{9}$/.test(national)) return null;
  return `+234${national}`;
}

/** Shows only the last two digits, for logs and support screens. */
export function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)} ••• ••• ••${phone.slice(-2)}`;
}
