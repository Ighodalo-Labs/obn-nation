'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clock, formatSentTo, postJson } from '@/lib/auth/client';
import { pillButton, primaryButton } from '@/components/listing/ui';

type Step = 'phone' | 'code' | 'name';

interface SendOk { sent: true; phone: string; resend_after_seconds: number }
interface VerifyOk { user: { needs_name: boolean }; next: string }

const input = 'min-h-14 w-full rounded-2xl border-2 border-[#E2D9CA] bg-white px-4 text-lg text-[#16140F] placeholder:text-[#8E8778] transition-colors hover:border-[#BDB3A1] focus:border-[#1565C0] focus:outline-none focus:ring-4 focus:ring-[#1565C0]/15';
const primary = `${primaryButton} w-full`;
const eyebrow = (text: string) => (
  <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-[#6B655A]">
    <span className="flex h-1 w-10 overflow-hidden rounded-full" aria-hidden="true"><i className="flex-1 bg-brand-red" /><i className="flex-1 bg-brand-green" /><i className="flex-1 bg-brand-blue" /></span>
    {text}
  </p>
);
const heading = 'font-display text-[clamp(2rem,6vw,2.9rem)] font-extrabold leading-[1.03] tracking-[-0.035em]';

export function SignInFlow({ next }: { next: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [digits, setDigits] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('/list/form');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    firstField.current?.focus();
  }, [step]);

  async function sendCode() {
    setBusy(true);
    setError(null);
    const r = await postJson<SendOk>('/api/auth/otp/send', { phone: `+234${digits.replace(/\D/g, '')}` });
    setBusy(false);
    if (!r.ok) {
      const retry = r.error.details?.retry_after_seconds;
      if (typeof retry === 'number') setWait(retry);
      return setError(r.error.message);
    }
    setPhone(r.data.phone);
    setCode('');
    setWait(r.data.resend_after_seconds);
    setStep('code');
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const r = await postJson<VerifyOk>('/api/auth/otp/verify', { phone, code, ...(next ? { next } : {}) });
    if (!r.ok) {
      setBusy(false);
      return setError(r.error.message);
    }
    setDestination(r.data.next);
    if (r.data.user.needs_name) {
      setBusy(false);
      return setStep('name');
    }
    router.push(r.data.next);
  }

  async function saveName() {
    setBusy(true);
    setError(null);
    const r = await postJson<{ full_name: string }>('/api/profile/name', { full_name: name }, 'PATCH');
    if (!r.ok) {
      setBusy(false);
      return setError(r.error.message);
    }
    router.push(destination);
  }

  const onSubmit = (fn: () => void) => (e: React.FormEvent) => {
    e.preventDefault();
    if (!busy) fn();
  };

  return (
    <section className="flex flex-col gap-5" aria-live="polite">
      {step === 'phone' && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit(sendCode)} noValidate>
          {eyebrow('Sell on OBN NATION')}
          <h1 className={heading}>Let’s get you in.</h1>
          <p className="-mt-2 text-lg text-[#6B655A]">We send a 6-digit code on WhatsApp. No password to remember.</p>
          <label htmlFor="phone" className="text-base font-bold">Your WhatsApp number</label>
          <div className="flex gap-2">
            <span className="flex min-h-14 items-center rounded-2xl bg-[#16140F] px-4 text-lg font-bold text-white">+234</span>
            <input
              id="phone" ref={firstField} className={input} type="tel" inputMode="tel" autoComplete="tel-national"
              placeholder="803 123 4567" value={digits} onChange={(e) => setDigits(e.target.value)} aria-describedby="phone-help"
            />
          </div>
          <p id="phone-help" className="text-sm text-[#6B655A]">Use a number that has WhatsApp. Buyers never see it.</p>
          <button className={primary} type="submit" disabled={busy || digits.replace(/\D/g, '').length < 10}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit(verify)} noValidate>
          {eyebrow('Check WhatsApp')}
          <h1 className={heading}>Enter your code.</h1>
          <p className="text-lg text-[#6B655A]">Sent to WhatsApp {formatSentTo(phone)}</p>
          <label htmlFor="code" className="sr-only">6-digit code</label>
          <input
            id="code" ref={firstField} className={`${input} text-center text-3xl font-extrabold tracking-[0.5em]`} type="text" inputMode="numeric"
            autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" className={pillButton} disabled={wait > 0 || busy} onClick={sendCode}>
              {wait > 0 ? `Resend in ${clock(wait)}` : 'Resend code'}
            </button>
            <button type="button" className={pillButton} onClick={() => { setStep('phone'); setError(null); }}>
              Change number
            </button>
          </div>
          <button className={primary} type="submit" disabled={busy || code.length !== 6}>
            {busy ? 'Checking…' : 'Verify'}
          </button>
        </form>
      )}

      {step === 'name' && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit(saveName)} noValidate>
          {eyebrow('Almost there')}
          <h1 className={heading}>One last thing.</h1>
          <label htmlFor="name" className="text-base font-bold">What should we call you?</label>
          <input
            id="name" ref={firstField} className={input} type="text" autoComplete="name" maxLength={80}
            placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} aria-describedby="name-help"
          />
          <p id="name-help" className="text-sm text-[#6B655A]">Shown to admins only.</p>
          <button className={primary} type="submit" disabled={busy || name.trim().length < 2}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-2xl border-2 border-[#C62828]/30 bg-[#FDECEA] p-4 text-base font-semibold text-[#7A1B16]">
          {error}
        </p>
      )}
    </section>
  );
}
