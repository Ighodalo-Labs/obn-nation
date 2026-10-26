import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env';
import { buildWebhookDeps } from '@/lib/telegram-deps';
import { handleUpdate } from '@/lib/telegram-webhook';

export const runtime = 'nodejs';

const digest = (s: string) => createHash('sha256').update(s).digest();

/** Telegram calls this for every message to the bot. Telegram sends our secret back in a header; anything else is refused. */
export async function POST(req: Request) {
  let env;
  try {
    env = serverEnv();
  } catch {
    return NextResponse.json({}, { status: 404 });
  }
  if (env.NEXT_PUBLIC_MESSAGE_CHANNEL !== 'telegram' || env.TELEGRAM_MODE !== 'live' || !env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({}, { status: 404 });
  }
  const sent = req.headers.get('x-telegram-bot-api-secret-token') ?? '';
  if (!timingSafeEqual(digest(sent), digest(env.TELEGRAM_WEBHOOK_SECRET))) return NextResponse.json({}, { status: 401 });

  try {
    await handleUpdate(buildWebhookDeps(env), await req.json());
  } catch {
    // Answer 200 anyway, or Telegram keeps retrying the same update. Nothing about the person is logged.
    console.error('[telegram] update failed');
  }
  return NextResponse.json({});
}
