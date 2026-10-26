import { describe, expect, it, vi } from 'vitest';
import { parseServerEnv } from './env';
import { deliverTelegram, otpText, rejectionText, sendMessage } from './telegram';
import { deliverOtp } from './otp-sender';
import { deliverRejection } from './rejection-sender';

const base = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcd.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(30),
  NEXT_PUBLIC_SITE_URL: 'https://obn.example',
  SUPABASE_SERVICE_ROLE_KEY: 's'.repeat(30),
  SEND_SMS_HOOK_SECRET: 'h'.repeat(24),
  CRON_SECRET: 'c'.repeat(24),
  NEXT_PUBLIC_MESSAGE_CHANNEL: 'telegram',
  TELEGRAM_BOT_TOKEN: '123456789:' + 'A'.repeat(30),
  TELEGRAM_WEBHOOK_SECRET: 'w'.repeat(32),
  TELEGRAM_BOT_USERNAME: 'obnnation_bot',
};
const live = parseServerEnv(base);
const stub = parseServerEnv({ ...base, TELEGRAM_MODE: 'stub', TELEGRAM_BOT_TOKEN: undefined, TELEGRAM_WEBHOOK_SECRET: undefined, TELEGRAM_BOT_USERNAME: undefined });

const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('sendMessage', () => {
  it('posts plain text to the bot API and returns the message id', async () => {
    const f = reply({ ok: true, result: { message_id: 77 } });
    const r = await sendMessage('T', 42, 'hello', undefined, f as unknown as typeof fetch);
    expect(r).toEqual({ status: 'sent', sid: 'tg_77' });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/botT/sendMessage');
    expect(JSON.parse(String(init.body))).toMatchObject({ chat_id: 42, text: 'hello' });
    expect(JSON.parse(String(init.body)).parse_mode).toBeUndefined();
  });
  it('reports a blocked bot by code and never leaks the text', async () => {
    const f = reply({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }, 403);
    expect(await sendMessage('T', 42, 'secret 123456', undefined, f as unknown as typeof fetch)).toEqual({ status: 'failed', reason: 'telegram_403' });
  });
  it('reports a network failure without throwing', async () => {
    const f = vi.fn(async () => { throw new Error('down'); });
    expect(await sendMessage('T', 42, 'x', undefined, f as unknown as typeof fetch)).toEqual({ status: 'failed', reason: 'telegram_network' });
  });
});

describe('texts', () => {
  it('puts the code in the sign-in message', () => {
    expect(otpText('481923')).toContain('481923');
  });
  it('flattens the reason and keeps the link whole', () => {
    const t = rejectionText({ firstName: 'Ada', title: 'Samsung\nS21', reason: 'Photos are\n blurry', link: 'https://obn.example/list/edit?token=abc' });
    expect(t).toContain('"Samsung S21"');
    expect(t).toContain('Reason: Photos are blurry');
    expect(t).toContain('https://obn.example/list/edit?token=abc');
  });
});

describe('deliverTelegram', () => {
  it('sends nothing in stub mode', async () => {
    const f = reply({ ok: true });
    const chatFor = vi.fn(async () => 1);
    expect(await deliverTelegram(stub, '+2348031234567', 'x', chatFor, f as unknown as typeof fetch)).toEqual({ status: 'sent', sid: 'stub' });
    expect(f).not.toHaveBeenCalled();
    expect(chatFor).not.toHaveBeenCalled();
  });
  it('fails clearly when the number is not linked', async () => {
    const f = reply({ ok: true });
    expect(await deliverTelegram(live, '+2348031234567', 'x', async () => null, f as unknown as typeof fetch)).toEqual({ status: 'failed', reason: 'telegram_not_linked' });
    expect(f).not.toHaveBeenCalled();
  });
  it('sends to the linked chat', async () => {
    const f = reply({ ok: true, result: { message_id: 5 } });
    expect(await deliverTelegram(live, '+2348031234567', 'x', async () => 99, f as unknown as typeof fetch)).toEqual({ status: 'sent', sid: 'tg_5' });
    expect(JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body)).chat_id).toBe(99);
  });
});

describe('channel switch', () => {
  it('routes the sign-in code and the rejection notice through Telegram', async () => {
    const f = reply({ ok: true, result: { message_id: 1 } });
    vi.stubGlobal('fetch', f);
    try {
      expect((await deliverOtp(live, '+2348031234567', '481923', async () => 7)).status).toBe('sent');
      expect((await deliverRejection(live, '+2348031234567', { firstName: 'Ada', title: 'T', reason: 'Blurry photos', link: 'https://x/y' }, async () => 7)).status).toBe('sent');
      expect(f).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('uses the stub marker so the admin test-link flow keeps working', async () => {
    expect(await deliverRejection(stub, '+2348031234567', { firstName: 'Ada', title: 'T', reason: 'r', link: 'https://x/y' })).toEqual({ status: 'sent', sid: 'stub' });
  });
});
