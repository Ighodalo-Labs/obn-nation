import { describe, expect, it } from 'vitest';
import { EnvError, parsePublicEnv, parseServerEnv } from './env';

const good = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcd.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'a'.repeat(30),
  NEXT_PUBLIC_SITE_URL: 'https://obn.example',
  SUPABASE_SERVICE_ROLE_KEY: 's'.repeat(30),
  SEND_SMS_HOOK_SECRET: 'h'.repeat(24),
  TWILIO_ACCOUNT_SID: 'AC' + '1'.repeat(32),
  TWILIO_AUTH_TOKEN: 't'.repeat(32),
  TWILIO_WHATSAPP_FROM: '+2347072767227',
  TWILIO_OTP_CONTENT_SID: 'HX' + '2'.repeat(32),
  TWILIO_REJECT_CONTENT_SID: 'HX' + '3'.repeat(32),
  CRON_SECRET: 'c'.repeat(24),
};

describe('environment checks', () => {
  it('accepts a complete server environment', () => {
    expect(parseServerEnv(good).TWILIO_WHATSAPP_FROM).toBe('+2347072767227');
  });

  it('public env needs only the three public names and returns no secrets', () => {
    const env = parsePublicEnv(good);
    expect(Object.keys(env).sort()).toEqual(['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_URL']);
  });

  it('lists every missing variable by name in one message', () => {
    try {
      parseServerEnv({});
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError);
      const message = (e as Error).message;
      for (const name of Object.keys(good)) expect(message).toContain(name);
      expect(message).toContain('.env.example');
    }
  });

  it('rejects a sender number without +country code', () => {
    expect(() => parseServerEnv({ ...good, TWILIO_WHATSAPP_FROM: '07072767227' })).toThrow(/international format/);
  });

  it('rejects a Twilio SID of the wrong kind', () => {
    expect(() => parseServerEnv({ ...good, TWILIO_ACCOUNT_SID: 'XX123' })).toThrow(/must start with AC/);
    expect(() => parseServerEnv({ ...good, TWILIO_OTP_CONTENT_SID: 'AB123' })).toThrow(/must start with HX/);
  });

  it('rejects a site URL that is not a URL', () => {
    expect(() => parsePublicEnv({ ...good, NEXT_PUBLIC_SITE_URL: 'obn.example' })).toThrow();
  });
});
