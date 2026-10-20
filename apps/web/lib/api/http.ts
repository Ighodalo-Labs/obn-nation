import { NextResponse } from 'next/server';
import type { ZodTypeAny, z } from 'zod';
import { ApiError, errorBody, newRequestId } from './errors';

export interface Ctx {
  requestId: string;
}

type Handler = (req: Request, ctx: Ctx) => Promise<Response>;

/** Wraps a route: adds x-request-id, turns ApiError and unexpected errors into the standard error body. */
export function handle(handler: Handler) {
  return async (req: Request): Promise<Response> => {
    const requestId = req.headers.get('x-request-id') ?? newRequestId();
    try {
      const res = await handler(req, { requestId });
      res.headers.set('x-request-id', requestId);
      return res;
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError('internal_error');
      if (!(e instanceof ApiError)) console.error(`[${requestId}] unexpected error`, e instanceof Error ? e.name : 'unknown');
      const res = NextResponse.json(errorBody(err, requestId), { status: err.status });
      res.headers.set('x-request-id', requestId);
      if (err.code === 'rate_limited' && typeof err.details?.retry_after_seconds === 'number') {
        res.headers.set('Retry-After', String(err.details.retry_after_seconds));
      }
      return res;
    }
  };
}

/** CSRF check from doc 07: on POST and PATCH the Origin header must equal the app origin. */
export function requireSameOrigin(req: Request, appOrigin: string): void {
  const origin = req.headers.get('origin');
  if (origin !== appOrigin) throw new ApiError('not_authorized', 'This request came from another site.');
}

/** Reads and validates a JSON body. Content-Type must be application/json. */
export async function readJson<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    throw new ApiError('validation_failed', 'Send the request as JSON.');
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError('validation_failed', 'The request body is not valid JSON.');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiError('validation_failed', undefined, {
      fields: parsed.error.issues.map((i) => ({ field: i.path.join('.'), reason: i.message })),
    });
  }
  return parsed.data;
}

export function ok(body: unknown, init?: ResponseInit): Response {
  return NextResponse.json(body, init);
}
