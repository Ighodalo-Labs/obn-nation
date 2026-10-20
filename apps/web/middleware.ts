import { NextResponse, type NextRequest } from 'next/server';
import {
  REF_COOKIE,
  REF_COOKIE_MAX_AGE_SECONDS,
  hasSessionCookie,
  needsSession,
  readsRef,
  referrerPolicyFor,
  securityHeaders,
  signInRedirect,
  validRef,
} from '@/lib/middleware/rules';

/**
 * Edge middleware. No database calls (architecture doc 01).
 * 1. Stores a valid `?ref=` code in the `obn_ref` cookie for 30 days.
 * 2. Sends signed-out visitors away from /admin/* and /list/form.
 * 3. Adds security headers.
 * Real access checks happen again on the server and in the database. A session cookie here only means "worth trying".
 */
export function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const production = process.env.NODE_ENV === 'production';

  let response: NextResponse;
  const signedIn = hasSessionCookie(request.cookies.getAll().map((c) => c.name));

  if (needsSession(pathname) && !signedIn) {
    response = NextResponse.redirect(new URL(signInRedirect(pathname, search), request.url));
  } else {
    response = NextResponse.next();
  }

  const ref = readsRef(pathname) ? validRef(searchParams.get('ref')) : null;
  if (ref) {
    response.cookies.set(REF_COOKIE, ref, {
      httpOnly: true,
      secure: production || request.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      maxAge: REF_COOKIE_MAX_AGE_SECONDS,
      path: '/',
    });
  }

  for (const [key, value] of Object.entries(securityHeaders(production))) response.headers.set(key, value);
  const referrer = referrerPolicyFor(pathname);
  if (referrer) response.headers.set('Referrer-Policy', referrer);
  return response;
}

export const config = {
  matcher: ['/', '/list/:path*', '/admin/:path*'],
};
