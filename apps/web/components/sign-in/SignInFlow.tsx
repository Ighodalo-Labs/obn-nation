'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clock, formatSentTo, getJson, postJson } from '@/lib/auth/client';
import { CHANNEL, CHANNEL_NAME } from '@/lib/channel';
import { pillButton, primaryButton } from '@/components/listing/ui';

type Step = 'phone' | 'telegram' | 'code' | 'name';

interface SendOk { sent: true; phone: string; resend_after_seconds: number }
interface NeedsLink { sent: false; needs_telegram_link: true; phone: string; deep_link: string; link_nonce: string }
interface VerifyOk { user: { needs_name: boolean }; next: string }

const input = 'min-h-14 w-full rounded-2xl border-2 border-[#E2D9CA] bg-white px-4 text-lg text-[#16140F] placeholder:text-[#8E8778] transition-colors hover:border-[#BDB3A1] focus:border-[#1565C0] focus:outline-none focus:ring-4 focus:ring-[#1565C0]/15';
const primary = `${primaryButton} w-full`;
const eyebrow = (text: string) => (
  <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-[#6B655A]">
    <span className="flex h-1 w-10 overflow-hidden rounded-full" aria-hidden="true"><i className="flex-1 bg-brand-red" /><i className="flex-1 bg-brand-green" /><i className="flex-1 bg-brand-blue" /></span>
    {text}
  </p>
);
const heading = 'font-display text-[clamp(2rem,6vw,2.9rem)] font-bold leading-[1.03] tracking-[-0.01em]';

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
  const [link, setLink] = useState<{ url: string; nonce: string } | null>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    firstField.current?.focus();
  }, [step]);

  // While the person links Telegram, ask whether it is done: every 2 seconds, and at once when they come back to this page.
  // Phones pause a page while another app is open, so the "come back" check is the one that matters.
  const checking = useRef(false);
  async function checkLinked(manual: boolean) {
    if (!link || checking.current) return; // one check at a time, so the code is asked for once
    checking.current = true;
    try {
      const r = await getJson<{ linked: boolean }>(`/api/auth/telegram/status?nonce=${link.nonce}&phone=${encodeURIComponent(phone)}`);
      if (r.ok && r.data.linked) {
        setError(null);
        await sendCode(true);
      } else if (manual) {
        setError('Not linked yet. In Telegram, press Start, then tap Share my number. Then come back and tap this button again.');
      }
    } finally {
      checking.current = false;
    }
  }
  const checkRef = useRef(checkLinked);
  checkRef.current = checkLinked;
  useEffect(() => {
    if (step !== 'telegram' || !link) return;
    const tick = () => void checkRef.current(false);
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    const timer = setInterval(tick, 2000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, [step, link]);

  async function sendCode(fromLink = false) {
    setBusy(true);
    setError(null);
    const r = await postJson<SendOk | NeedsLink>('/api/auth/otp/send', { phone: `+234${digits.replace(/\D/g, '')}` });
    setBusy(false);
    if (!r.ok) {
      const retry = r.error.details?.retry_after_seconds;
      if (typeof retry === 'number') setWait(retry);
      // Coming back from Telegram: a code was sent a moment ago, so go on to the code step instead of showing an error.
      if (fromLink && r.error.code === 'rate_limited') {
        setCode('');
        return setStep('code');
      }
      return setError(r.error.message);
    }
    if (!r.data.sent) {
      // Telegram only: this number is not linked yet. Show the Start link and wait for the link to finish.
      setPhone(r.data.phone);
      setLink({ url: r.data.deep_link, nonce: r.data.link_nonce });
      return setStep('telegram');
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
        <form className="sell-stagger flex flex-col gap-4" onSubmit={onSubmit(() => void sendCode())} noValidate>
          {eyebrow('Sell on OBN NATION')}
          <h1 className={heading}>Let’s get you in.</h1>
          <p className="-mt-2 text-lg text-[#6B655A]">We send a 6-digit code on {CHANNEL_NAME}. No password to remember.</p>
          <label htmlFor="phone" className="text-base font-bold">{CHANNEL === 'telegram' ? 'Your phone number' : 'Your WhatsApp number'}</label>
          <div className="flex gap-2">
            <span className="sell-chip flex min-h-14 items-center rounded-2xl bg-[#16140F] px-4 text-lg font-bold text-white">+234</span>
            <input
              id="phone" ref={firstField} className={input} type="tel" inputMode="tel" autoComplete="tel-national"
              placeholder="803 123 4567" value={digits} onChange={(e) => setDigits(e.target.value)} aria-describedby="phone-help"
            />
          </div>
          <p id="phone-help" className="text-sm text-[#6B655A]">{CHANNEL === 'telegram' ? 'Use the number on your Telegram account. Buyers never see it.' : 'Use a number that has WhatsApp. Buyers never see it.'}</p>
          <button className={primary} type="submit" disabled={busy || digits.replace(/\D/g, '').length < 10}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </form>
      )}

      {step === 'telegram' && link && (
        <div className="sell-stagger flex flex-col gap-4">
          {eyebrow('Link Telegram')}
          <h1 className={heading}>Open Telegram once.</h1>
          <p className="text-lg text-[#6B655A]">We send your code there. You only do this the first time.</p>
          <ol className="flex flex-col gap-3 text-base text-[#16140F]">
            <li className="flex gap-3"><b className="font-display text-xl">1</b><span>Tap <b>Open Telegram</b> below.</span></li>
            <li className="flex gap-3"><b className="font-display text-xl">2</b><span>Press <b>Start</b> in the chat.</span></li>
            <li className="flex gap-3"><b className="font-display text-xl">3</b><span>Tap <b>Share my number</b>. It must be {formatSentTo(phone)}.</span></li>
          </ol>
          <a className={`${primary} flex items-center justify-center`} href={link.url} target="_blank" rel="noopener noreferrer">Open Telegram</a>
          <button type="button" className={pillButton} disabled={busy} onClick={() => void checkLinked(true)}>
            {busy ? 'Sending…' : 'I’ve shared my number, send my code'}
          </button>
          <p className="text-sm text-[#6B655A]" role="status">This page also checks by itself when you come back from Telegram.</p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" className={pillButton} onClick={() => { setStep('phone'); setLink(null); setError(null); }}>
              Change number
            </button>
          </div>
        </div>
      )}

      {step === 'code' && (
        <form className="sell-stagger flex flex-col gap-4" onSubmit={onSubmit(verify)} noValidate>
          {eyebrow(`Check ${CHANNEL_NAME}`)}
          <h1 className={heading}>Enter your code.</h1>
          <p className="text-lg text-[#6B655A]">Sent to {CHANNEL_NAME} {formatSentTo(phone)}</p>
          <label htmlFor="code" className="sr-only">6-digit code</label>
          <div className="relative">
            <div className="grid grid-cols-6 gap-2 sm:gap-3" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className={`sell-box flex h-16 items-center justify-center rounded-2xl border-2 bg-white font-display text-3xl font-bold text-[#16140F] transition-all duration-200 ${code[i] ? 'sell-pop border-[#16140F]' : i === code.length ? 'border-[#1565C0] ring-4 ring-[#1565C0]/15' : 'border-[#E2D9CA]'}`}
                >
                  {code[i] ?? (i === code.length ? <i className="sell-caret h-7 w-0.5 bg-[#1565C0]" /> : '')}
                </span>
              ))}
            </div>
            <input
              id="code" ref={firstField} className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0" type="text" inputMode="numeric"
              autoComplete="one-time-code" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" className={pillButton} disabled={wait > 0 || busy} onClick={() => void sendCode()}>
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
        <form className="sell-stagger flex flex-col gap-4" onSubmit={onSubmit(saveName)} noValidate>
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
        <p key={error} role="alert" className="sell-shake rounded-2xl border-2 border-[#C62828]/30 bg-[#FDECEA] p-4 text-base font-semibold text-[#7A1B16]">
          {error}
        </p>
      )}
    </section>
  );
}
