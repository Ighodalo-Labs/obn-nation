import { z } from 'zod';
import { normalizeNgPhone } from '@/lib/phone';
import type { ReplyMarkup } from '@/lib/telegram';
import { botTexts } from '@/lib/telegram';

/**
 * What the bot does with an update from Telegram (CR-01, doc 11).
 * Only two things matter: "/start <one-time code>" and "here is my contact".
 * A number is linked only when the contact belongs to the account that sent it (contact.user_id = from.id)
 * AND equals the number typed on the site (checked in the database function).
 */

export type LinkResult = 'linked' | 'phone_mismatch' | 'no_request';

export interface WebhookDeps {
  attachStart(nonce: string, chatId: number, userId: number): Promise<boolean>;
  completeLink(chatId: number, userId: number, phone: string, username: string | null): Promise<LinkResult>;
  reply(chatId: number, text: string, markup?: ReplyMarkup): Promise<void>;
}

const update = z.object({
  message: z
    .object({
      chat: z.object({ id: z.number(), type: z.string() }),
      from: z.object({ id: z.number(), username: z.string().optional() }).optional(),
      text: z.string().optional(),
      contact: z.object({ phone_number: z.string(), user_id: z.number().optional() }).optional(),
    })
    .optional(),
});

const START = /^\/start(?:@\w+)?(?:\s+([0-9a-f]{32}))?\s*$/i;
const SHARE_BUTTON: ReplyMarkup = {
  keyboard: [[{ text: 'Share my number', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

export async function handleUpdate(deps: WebhookDeps, raw: unknown): Promise<void> {
  const parsed = update.safeParse(raw);
  const m = parsed.success ? parsed.data.message : undefined;
  if (!m || !m.from || m.chat.type !== 'private') return; // groups and channels are ignored
  const chatId = m.chat.id;

  if (m.contact) {
    if (m.contact.user_id !== m.from.id) return void (await deps.reply(chatId, botTexts.notYours, SHARE_BUTTON));
    const phone = normalizeNgPhone(m.contact.phone_number.startsWith('+') ? m.contact.phone_number : `+${m.contact.phone_number}`);
    if (!phone) return void (await deps.reply(chatId, botTexts.notNigerian, { remove_keyboard: true }));
    const result = await deps.completeLink(chatId, m.from.id, phone, m.from.username ?? null);
    const text = result === 'linked' ? botTexts.linked : result === 'phone_mismatch' ? botTexts.mismatch : botTexts.noRequest;
    return void (await deps.reply(chatId, text, { remove_keyboard: true }));
  }

  const start = m.text ? START.exec(m.text.trim()) : null;
  if (!start) return;
  const nonce = start[1]?.toLowerCase();
  if (!nonce) return void (await deps.reply(chatId, botTexts.hello));
  const attached = await deps.attachStart(nonce, chatId, m.from.id);
  await deps.reply(chatId, attached ? botTexts.askContact : botTexts.noRequest, attached ? SHARE_BUTTON : undefined);
}
