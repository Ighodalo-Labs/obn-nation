import 'server-only';
import type { ServerEnv } from '@/lib/env';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { sendMessage } from '@/lib/telegram';
import type { LinkResult, WebhookDeps } from '@/lib/telegram-webhook';

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`database call failed: ${res.error.message}`);
  return res.data;
}

/** The chat linked to this number, or null. */
export async function chatIdForPhone(phone: string): Promise<number | null> {
  const data = must(await createAdminSupabase().rpc('telegram_chat_for', { p_phone: phone }));
  return data === null || data === undefined ? null : Number(data);
}

/** Starts a link for this number. Returns the one-time code for the Start link. */
export async function requestLink(phone: string): Promise<string> {
  return String(must(await createAdminSupabase().rpc('telegram_request_link', { p_phone: phone })));
}

export async function linkIsDone(nonce: string): Promise<boolean> {
  return must(await createAdminSupabase().rpc('telegram_link_done', { p_nonce: nonce })) === true;
}

export function buildWebhookDeps(env: ServerEnv): WebhookDeps {
  const admin = createAdminSupabase();
  return {
    attachStart: async (nonce, chatId, userId) =>
      must(await admin.rpc('telegram_attach_start', { p_nonce: nonce, p_chat: chatId, p_user: userId })) === true,
    completeLink: async (chatId, userId, phone, username) =>
      String(must(await admin.rpc('telegram_complete_link', { p_chat: chatId, p_user: userId, p_contact_phone: phone, p_username: username }))) as LinkResult,
    reply: async (chatId, text, markup) => void (await sendMessage(env.TELEGRAM_BOT_TOKEN!, chatId, text, markup)),
  };
}
