import { Webhook } from 'standardwebhooks';
import { describe, expect, it } from 'vitest';
import { HookRefused, processHook, toE164, verifyHook, type HookPayload } from './hook';

const SECRET_B64 = Buffer.from('a-very-secret-signing-key-123456').toString('base64');
const SECRET = `v1,whsec_${SECRET_B64}`;
const payload: HookPayload = { user: { id: 'u1', phone: '2348031234567' }, sms: { otp: '481923' } };

function signed(body: string, secret = SECRET_B64) {
  const wh = new Webhook(secret);
  const id = 'msg_1';
  const ts = new Date();
  const sig = wh.sign(id, ts, body);
  return new Headers({ 'webhook-id': id, 'webhook-timestamp': String(Math.floor(ts.getTime() / 1000)), 'webhook-signature': sig });
}

describe('verifyHook', () => {
  it('accepts a correctly signed call', () => {
    const body = JSON.stringify(payload);
    expect(verifyHook(SECRET, body, signed(body)).sms.otp).toBe('481923');
  });
  it('refuses a wrong signature', () => {
    const body = JSON.stringify(payload);
    const other = Buffer.from('another-key-another-key-another!').toString('base64');
    expect(() => verifyHook(SECRET, body, signed(body, other))).toThrow();
  });
  it('refuses a body that was changed after signing', () => {
    const body = JSON.stringify(payload);
    expect(() => verifyHook(SECRET, body.replace('481923', '000000'), signed(body))).toThrow();
  });
  it('refuses a call with no signature headers', () => {
    expect(() => verifyHook(SECRET, JSON.stringify(payload), new Headers())).toThrow();
  });
});

describe('processHook', () => {
  it('adds the + and sends the code', async () => {
    let sentTo = '';
    await processHook({ isBlacklisted: async () => false, deliver: async (p) => { sentTo = p; return { status: 'sent' }; } }, payload);
    expect(sentTo).toBe('+2348031234567');
    expect(toE164('+2348031234567')).toBe('+2348031234567');
  });
  it('refuses blacklisted numbers without sending', async () => {
    let sent = false;
    const deps = { isBlacklisted: async () => true, deliver: async () => { sent = true; return { status: 'sent' as const }; } };
    await expect(processHook(deps, payload)).rejects.toBeInstanceOf(HookRefused);
    expect(sent).toBe(false);
  });
  it('reports a Twilio failure as a refusal', async () => {
    const deps = { isBlacklisted: async () => false, deliver: async () => ({ status: 'failed' as const, reason: 'twilio_63016' }) };
    await expect(processHook(deps, payload)).rejects.toThrow('twilio_63016');
  });
});
