/** Small helpers used by the sign-in screens in the browser. No secrets, no server imports. */

export interface ApiFailure {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export async function postJson<T>(url: string, body: unknown, method: 'POST' | 'PATCH' = 'POST'): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
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
  } catch {
    return { ok: false, error: { code: 'network', message: 'No connection. Check your network and try again.' } };
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
