'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clock, formatSentTo, postJson } from '@/lib/auth/client';

type Step = 'phone' | 'code' | 'name';

interface SendOk { sent: true; phone: string; resend_after_seconds: number }
interface VerifyOk { user: { needs_name: boolean }; next: string }

const input = 'h-12 w-full rounded-lg border border-border bg-surface px-3 text-base text-white placeholder:text-muted focus:border-tint-blue focus:outline-none focus:ring-2 focus:ring-tint-blue';
const primary = 'h-12 w-full rounded-lg bg-brand-red text-base font-semibold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

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
    <section className="flex flex-col gap-4 pb-8" aria-live="polite">
      {step === 'phone' && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit(sendCode)} noValidate>
          <h1 className="text-[26px] font-semibold leading-tight">Sign in with WhatsApp</h1>
          <label htmlFor="phone" className="text-sm text-muted">Phone number</label>
          <div className="flex gap-2">
            <span className="flex h-12 items-center rounded-lg border border-border bg-surface px-3 text-base text-muted">+234</span>
            <input
              id="phone" ref={firstField} className={input} type="tel" inputMode="tel" autoComplete="tel-national"
              placeholder="803 123 4567" value={digits} onChange={(e) => setDigits(e.target.value)} aria-describedby="phone-help"
            />
          </div>
          <p id="phone-help" className="text-sm text-muted">Use a number that has WhatsApp.</p>
          <button className={primary} type="submit" disabled={busy || digits.replace(/\D/g, '').length < 10}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit(verify)} noValidate>
          <h1 className="text-[26px] font-semibold leading-tight">Enter your code</h1>
          <p className="text-base text-muted">Sent to WhatsApp {formatSentTo(phone)}</p>
          <label htmlFor="code" className="sr-only">6-digit code</label>
          <input
            id="code" ref={firstField} className={`${input} text-center text-2xl tracking-[0.5em]`} type="text" inputMode="numeric"
            autoComplete="one-time-code" maxLength={6} placeholder="••••••" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          <div className="flex items-center justify-between text-sm">
            <button type="button" className="min-h-12 text-tint-blue underline disabled:text-muted disabled:no-underline" disabled={wait > 0 || busy} onClick={sendCode}>
              {wait > 0 ? `Resend in ${clock(wait)}` : 'Resend code'}
            </button>
            <button type="button" className="min-h-12 text-tint-blue underline" onClick={() => { setStep('phone'); setError(null); }}>
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
          <h1 className="text-[26px] font-semibold leading-tight">One last thing</h1>
          <label htmlFor="name" className="text-base">What should we call you?</label>
          <input
            id="name" ref={firstField} className={input} type="text" autoComplete="name" maxLength={80}
            placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} aria-describedby="name-help"
          />
          <p id="name-help" className="text-sm text-muted">Shown to admins only.</p>
          <button className={primary} type="submit" disabled={busy || name.trim().length < 2}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-tint-red bg-surface p-3 text-base text-tint-red">
          {error}
        </p>
      )}
    </section>
  );
}
