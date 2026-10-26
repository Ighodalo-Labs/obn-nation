import type { ServerEnv } from '@/lib/env';
import { maskPhone } from '@/lib/phone';
import type { SendResult } from '@/lib/whatsapp';

/** Telegram Bot API sender and the texts the bot says (CR-01, doc 11). Never logs a code, a link, a reason or a token. */

const API = 'https://api.telegram.org';

type Fetch = typeof fetch;
export type ChatLookup = (phone: string) => Promise<number | null>;

export interface ReplyMarkup {
  keyboard?: { text: string; request_contact?: boolean }[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  remove_keyboard?: boolean;
}

/** Plain text only (no parse mode), so a title or reason can never break the message. */
export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: ReplyMarkup,
  fetchImpl: Fetch = fetch,
): Promise<SendResult> {
  try {
    const res = await fetchImpl(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error_code?: number; result?: { message_id?: number } } | null;
    if (res.ok && json?.ok) return { status: 'sent', sid: `tg_${json.result?.message_id ?? 0}` };
    return { status: 'failed', reason: `telegram_${json?.error_code ?? res.status}` };
  } catch {
    return { status: 'failed', reason: 'telegram_network' };
  }
}

export const otpText = (code: string) =>
  `Your OBN NATION sign-in code is ${code}.\nIt works for 10 minutes. Do not share it with anyone.`;

const clean = (value: string, max: number) => {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

export function rejectionText(d: { firstName: string; title: string; reason: string; link: string }): string {
  return [
    `Hi ${clean(d.firstName || 'there', 40)}, your listing "${clean(d.title, 80)}" needs a fix before we can approve it.`,
    '',
    `Reason: ${clean(d.reason, 500)}`,
    '',
    'Fix it and send it again here:',
    d.link,
    '',
    'The link works once. If it stops working, ask your admin for a new one.',
  ].join('\n');
}

export const botTexts = {
  askContact: 'Almost done. Tap the button below to share your number, so we know this Telegram is yours.',
  linked: 'Done. This Telegram is now linked to your number. Go back to the OBN NATION page. Your code is on its way.',
  mismatch: 'That number is not the one you typed on the OBN NATION page. Go back, check the number, and start again.',
  noRequest: 'This link has expired. Go back to the OBN NATION page and ask for a new code.',
  notYours: 'Please share your own number with the button below.',
  notNigerian: 'OBN NATION works with Nigerian numbers for now.',
  hello: 'Hi, this is the OBN NATION bot. It sends your sign-in code and messages about your listings. To start, enter your number on the OBN NATION page and tap Open Telegram.',
} as const;

/**
 * Sends one message to the Telegram chat linked to this number.
 * Stub mode sends nothing (test numbers). An unlinked number fails with telegram_not_linked.
 */
export async function deliverTelegram(env: ServerEnv, phone: string, text: string, chatFor: ChatLookup, fetchImpl: Fetch = fetch): Promise<SendResult> {
  if (env.TELEGRAM_MODE === 'stub') {
    console.info(`[telegram:stub] message for ${maskPhone(phone)}; nothing sent`);
    return { status: 'sent', sid: 'stub' };
  }
  const chat = await chatFor(phone);
  if (chat === null) return { status: 'failed', reason: 'telegram_not_linked' };
  return sendMessage(env.TELEGRAM_BOT_TOKEN!, chat, text, undefined, fetchImpl);
}
