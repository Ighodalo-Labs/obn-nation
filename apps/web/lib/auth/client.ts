/** Small helpers used by the sign-in screens in the browser. No secrets, no server imports. */

export interface ApiFailure {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

/** A slow network must never leave a screen stuck, so every call gives up after 15 seconds. */
const TIMEOUT_MS = 15_000;
const SLOW: ApiFailure = { code: 'network', message: 'This is taking too long. Check your network and try again.' };
const OFFLINE: ApiFailure = { code: 'network', message: 'No connection. Check your network and try again.' };
const fail = (e: unknown): { ok: false; error: ApiFailure } => ({ ok: false, error: e instanceof DOMException && (e.name === 'TimeoutError' || e.name === 'AbortError') ? SLOW : OFFLINE });

export async function postJson<T>(url: string, body: unknown, method: 'POST' | 'PATCH' = 'POST'): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: json as T };
    const e = json?.error;
    return {
      ok: false,
      error: {
        code: typeof e?.code === 'string' ? e.code : 'internal_error',
        message: typeof e?.message === 'string' ? e.message : 'Something went wrong. Please try again.',
        details: e?.details,
      },
    };
  } catch (e) {
    return fail(e);
  }
}

/** Reads one JSON answer with GET. Same result shape as postJson. */
export async function getJson<T>(url: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, data: json as T };
    return { ok: false, error: { code: 'internal_error', message: 'Something went wrong. Please try again.' } };
  } catch (e) {
    return fail(e);
  }
}

/** "+2348031234567" -> "+234 803 *** 4567" (wireframe 2B). */
export function formatSentTo(phone: string): string {
  const m = /^\+234(\d{3})\d{3}(\d{4})$/.exec(phone);
  return m ? `+234 ${m[1]} *** ${m[2]}` : phone;
}

/** Seconds as m:ss for the resend countdown. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
