'use client';

import { useState } from 'react';
import { postJson } from '@/lib/auth/client';
import { LegalInline } from '@/components/legal/LegalLinks';

const field = 'min-h-12 w-full rounded-2xl border-2 border-[#E2D9CA] bg-white px-4 text-base text-[#16140F] placeholder:text-[#8E8778] focus:border-[#1565C0] focus:outline-none focus:ring-4 focus:ring-[#1565C0]/15';
const box = 'flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 text-base font-semibold transition-colors';

/** Email and SMS sign-up bar, shown above the footer. Milestone 1 only collects the details. */
export function NewsletterBar() {
  const [wantsEmail, setWantsEmail] = useState(true);
  const [wantsSms, setWantsSms] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!wantsEmail && !wantsSms) return setError('Choose Email, SMS, or both.');
    if (!consent) return setError('Please tick the box to agree.');
    setBusy(true);
    try {
      const r = await postJson<{ subscribed: boolean }>('/api/newsletter/subscribe', { wantsEmail, wantsSms, email, phone, consent, company: trap });
      if (r.ok) setDone(true);
      else setError(r.error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="newsletter-title" className="mx-auto mt-14 w-full max-w-6xl px-4 text-[#16140F]">
      <div className="overflow-hidden rounded-[2rem] border border-[#EDE6D9] bg-[#FAF7F2] shadow-[0_30px_70px_-45px_rgba(22,20,15,.45)]">
        <div className="flex h-1.5" aria-hidden="true"><span className="flex-1 bg-brand-red" /><span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-blue" /></div>
        <div className="grid gap-6 p-6 sm:p-9 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
          <div>
            <h2 id="newsletter-title" className="font-display text-2xl font-bold leading-tight sm:text-3xl">Get updates from OBN NATION</h2>
            <p className="mt-2 text-base text-[#6B655A]">New listings and news, by email, SMS, or both.</p>
          </div>
          {done ? (
            <p role="status" className="flex items-center gap-3 text-lg font-bold text-[#1B7F3B]">
              <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1B7F3B] text-white">✓</span>
              You are subscribed. Thank you.
            </p>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-4">
              <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className="sr-only">How should we reach you?</legend>
                <label className={`${box} ${wantsEmail ? 'border-[#1565C0] bg-white' : 'border-[#E2D9CA] bg-white/60'}`}>
                  <input type="checkbox" checked={wantsEmail} onChange={(e) => setWantsEmail(e.target.checked)} className="h-5 w-5 accent-[#1565C0]" />Email
                </label>
                <label className={`${box} ${wantsSms ? 'border-[#1565C0] bg-white' : 'border-[#E2D9CA] bg-white/60'}`}>
                  <input type="checkbox" checked={wantsSms} onChange={(e) => setWantsSms(e.target.checked)} className="h-5 w-5 accent-[#1565C0]" />SMS
                </label>
              </fieldset>
              {wantsEmail && (
                <label className="grid gap-1.5 text-sm font-semibold">Your email
                  <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={field} />
                </label>
              )}
              {wantsSms && (
                <label className="grid gap-1.5 text-sm font-semibold">Your phone number
                  <span className="flex gap-2">
                    <span className="flex min-h-12 items-center rounded-2xl border-2 border-[#E2D9CA] bg-white px-3 text-base text-[#6B655A]">+234</span>
                    <input type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="803 123 4567" className={field} />
                  </span>
                </label>
              )}
              {/* Trap field for bots. People never see it. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Company<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-[#3B372F]">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#1565C0]" />
                <span>By subscribing you agree to the <LegalInline kind="terms">Terms & Conditions</LegalInline> and <LegalInline kind="privacy">Privacy Policy</LegalInline>. You can unsubscribe at any time.</span>
              </label>
              {error && <p role="alert" className="text-sm font-semibold text-[#B3261E]">{error}</p>}
              <button type="submit" disabled={busy} className="flex min-h-12 items-center justify-center rounded-full bg-[#16140F] px-7 text-base font-bold text-white transition-colors hover:bg-[#2B2820] disabled:opacity-60">
                {busy ? 'Subscribing…' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
