'use client';

import Image from 'next/image';
import { useEffect, useRef, type ReactNode } from 'react';
import { AGES, CATEGORIES, REGIONS, WORKING } from '@/lib/listing/schema';

/** Shared bits for the admin console. Look-up helpers, stat cards and one in-page dialog shell. */
export const labelOf = (list: readonly { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;
export const categoryLabel = (v: string) => labelOf(CATEGORIES, v);
export const regionLabelOf = (v: string | null) => (v ? labelOf(REGIONS, v) : '');
export const ageLabel = (v: string) => labelOf(AGES, v);
export const workingLabel = (v: string) => labelOf(WORKING, v);

export type Tone = 'green' | 'blue' | 'red' | 'amber' | 'mute';

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`ops-badge ops-b-${tone}`}>{children}</span>;
}

/** One tinted tile of a KPI row. Wrap several in <div className="ops-kpis">. */
export function BigStat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: Exclude<Tone, 'mute'> }) {
  const dot = tone ? { red: '#D32F2F', green: '#2E7D32', blue: '#1565C0', amber: '#9A5B00' }[tone] : '#3F3F3C';
  return (
    <div className="ops-kpi">
      <p className="flex items-center gap-2.5 text-[13.5px] font-bold"><span className="ops-stepno" style={{ background: dot }} aria-hidden="true" />{label}</p>
      <p className="ops-num mt-5 text-[40px] sm:text-[46px]">{value}</p>
      {hint && <p className="ops-mute mt-2 text-[13px] font-medium">{hint}</p>}
    </div>
  );
}

/** Dark photo band at the top of every admin page: eyebrow, big headline, actions and the KPI tiles. */
export function Hero({ photo, pos = 'object-center', eyebrow, title, sub, actions, children }: {
  photo: string; pos?: string; eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode; children?: ReactNode;
}) {
  return (
    <section className="ops-hero">
      <div className="ops-hero-photo" aria-hidden="true">
        <Image src={photo} alt="" fill priority sizes="100vw" className={`object-cover ${pos}`} />
      </div>
      <div className="ops-inner flex flex-col gap-9 pb-10 pt-10 lg:gap-12 lg:pb-14 lg:pt-16">
        <div className="ops-rise flex flex-col gap-5">
          {eyebrow && <p className="ops-eyebrow-hero"><span className="ops-tri" aria-hidden="true"><i /><i /><i /></span>{eyebrow}</p>}
          <h1 className="ops-h1 max-w-4xl">{title}</h1>
          {sub && <p className="max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg" aria-live="polite">{sub}</p>}
          {actions && <div className="mt-1 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Full-width tinted section with the shared page width. */
export function Band({ tone, children, className = '', id, label }: { tone?: 'green' | 'cream' | 'pink' | 'blue' | 'dark'; children: ReactNode; className?: string; id?: string; label?: string }) {
  return (
    <section id={id} aria-label={label} className="ops-band scroll-mt-20" data-tone={tone}>
      <div className={`ops-inner ${className}`}>{children}</div>
    </section>
  );
}

/** Solid colour tab on a photo, e.g. "Waiting 5h". */
export function Ribbon({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`ops-ribbon ops-b-${tone}`}>{children}</span>;
}

export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight">{title}</h1>
        {sub && <p className="ops-mute mt-1 text-[13.5px]" aria-live="polite">{sub}</p>}
      </div>
      {children && <div className="flex flex-none items-center gap-2">{children}</div>}
    </div>
  );
}

/** Centered dialog (bottom sheet on phones). Esc closes. Focus moves in when it opens and returns to the trigger when it closes. */
export function Dialog({ title, children, onClose, busy = false, z = 60 }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; z?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current?.querySelector<HTMLElement>('textarea, input, select, button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab' && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, a[href]'));
        if (f.length === 0) return;
        const a = f[0], z2 = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z2.focus(); }
        else if (!e.shiftKey && document.activeElement === z2) { e.preventDefault(); a.focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); before?.focus?.(); };
  }, [busy, onClose]);
  return (
    <div className="fixed inset-0 flex items-end justify-center bg-[#0A0A0A]/60 p-0 backdrop-blur-[3px] sm:items-center sm:p-4" style={{ zIndex: z }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="ops-card ops-pop ops-scroll flex max-h-[92vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-b-none p-6 shadow-[0_24px_64px_-16px_rgba(10,10,10,.5)] sm:rounded-[28px]">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Proper in-page confirm. Replaces window.confirm. */
export function ConfirmDialog({ title, body, confirmLabel, tone = 'go', busy, onConfirm, onCancel }: {
  title: string; body: ReactNode; confirmLabel: string; tone?: 'go' | 'red'; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Dialog title={title} onClose={onCancel} busy={busy} z={70}>
      <div className="text-sm leading-relaxed">{body}</div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="ops-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" data-autofocus className={`ops-btn ${tone === 'red' ? 'ops-btn-red' : 'ops-btn-go'}`} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
      </div>
    </Dialog>
  );
}

export function Thumb({ src, size = 'h-24 w-24' }: { src?: string; size?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`${size} flex-none rounded-2xl object-cover`} />
  ) : <div className={`${size} flex-none rounded-2xl bg-[var(--o-card2)]`} aria-hidden="true" />;
}

export function Notice({ kind, children }: { kind: 'ok' | 'error'; children: ReactNode }) {
  return (
    <p role={kind === 'ok' ? 'status' : 'alert'} className={`rounded-2xl border px-4 py-3 text-[14px] font-semibold ${kind === 'ok' ? 'ops-notice-ok' : 'ops-notice-err'}`}>{children}</p>
  );
}
