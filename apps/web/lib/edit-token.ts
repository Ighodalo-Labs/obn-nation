import { createHash, randomUUID } from 'node:crypto';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface NewEditToken {
  /** The UUID that goes in the WhatsApp link. Never store it. */
  token: string;
  /** SHA-256 of the token as 64 lowercase hex characters. This is what the database stores. */
  hash: string;
  /** Full link for the seller. */
  link: string;
}

export function isValidTokenShape(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4.test(value);
}

/** SHA-256 hex of a token. Call isValidTokenShape first on anything that came from a request. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token.toLowerCase(), 'utf8').digest('hex');
}

export function newEditToken(appBaseUrl: string): NewEditToken {
  const token = randomUUID();
  const base = appBaseUrl.replace(/\/+$/, '');
  return { token, hash: hashToken(token), link: `${base}/list/edit?token=${token}` };
}
