/** Pure rules for the edge middleware. No Next.js imports, so they are easy to test. */

export const REF_COOKIE = 'obn_ref';
export const REF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const REF_PATTERN = /^[a-f0-9]{8}$/;

/** Returns the referral code if it has the right shape (8 lowercase hex characters), otherwise null. */
export function validRef(value: string | null | undefined): string | null {
  return value && REF_PATTERN.test(value) ? value : null;
}

/** Pages where a `?ref=` value is picked up (PRD SI-6). */
/** ED-10: the edit page must not leak its token in a Referer header. */
export function referrerPolicyFor(pathname: string): string | null {
  return pathname === '/list/edit' || pathname.startsWith('/list/edit/') ? 'no-referrer' : null;
}

export function readsRef(pathname: string): boolean {
  return pathname === '/' || pathname === '/list' || pathname.startsWith('/list/');
}

/** Pages that need a signed-in person. `/list/edit` is open: it uses the edit link instead. */
export function needsSession(pathname: string): boolean {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true;
  return pathname === '/list/form' || pathname.startsWith('/list/form/');
}

/**
 * Where to send a signed-out visitor.
 * Admin pages go to /list with a `next` value. The seller form goes to plain /list.
 */
export function signInRedirect(pathname: string, search: string): string {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return `/list?next=${encodeURIComponent(pathname + search)}`;
  }
  return '/list';
}

/** Only allow `next` values that stay inside /admin. Blocks open redirects. */
export function safeNext(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/admin')) return null;
  if (value.startsWith('//') || value.includes('\\') || /[\r\n]/.test(value)) return null;
  if (value !== '/admin' && !/^\/admin[/?#]/.test(value)) return null;
  return value;
}

/** True when the request carries a Supabase session cookie (`sb-<project>-auth-token`, maybe chunked). */
export function hasSessionCookie(names: string[]): boolean {
  return names.some((n) => /^sb-.+-auth-token(\.\d+)?$/.test(n));
}

export function securityHeaders(production: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
  };
  if (production) headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return headers;
}
