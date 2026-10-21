'use client';

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

/** A big editorial number with a small label. No box around it. */
export function BigStat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: Exclude<Tone, 'mute'> }) {
  const bar = tone ? { red: 'bg-brand-red', green: 'bg-brand-green', blue: 'bg-brand-blue', amber: 'bg-[#F2B233]' }[tone] : 'bg-[#16140F]';
  return (
    <div className="min-w-0">
      <span className={`mb-3 block h-1.5 w-10 rounded-full ${bar}`} aria-hidden="true" />
      <p className="ops-num text-[44px] sm:text-[56px]">{value}</p>
      <p className="mt-2 text-[15px] font-extrabold">{label}</p>
      {hint && <p className="ops-mute mt-0.5 text-sm">{hint}</p>}
    </div>
  );
}

/** Solid colour tab on a photo, e.g. "Waiting 5h". */
export function Ribbon({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`ops-ribbon ops-b-${tone}`}>{children}</span>;
}

export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[44px] font-extrabold leading-[0.95] tracking-[-0.035em] sm:text-6xl">{title}</h1>
        {sub && <p className="ops-mute mt-3 max-w-xl text-base" aria-live="polite">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
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
    <div className="fixed inset-0 flex items-end justify-center bg-[#16140F]/65 p-0 sm:items-center sm:p-4" style={{ zIndex: z }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="ops-card ops-pop ops-scroll flex max-h-[92vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-b-none border-2 !border-[#16140F] p-6 sm:rounded-2xl">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
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
      <div className="text-[15px] leading-relaxed">{body}</div>
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
    <img src={src} alt="" className={`${size} flex-none rounded-xl object-cover`} />
  ) : <div className={`${size} flex-none rounded-xl bg-[#EBE5D6]`} aria-hidden="true" />;
}

export function Notice({ kind, children }: { kind: 'ok' | 'error'; children: ReactNode }) {
  return (
    <p role={kind === 'ok' ? 'status' : 'alert'} className={`rounded-xl border-2 px-4 py-3 text-[15px] font-semibold ${kind === 'ok' ? 'border-[#2E7D32] bg-[#E3F1E4] text-[#1B5E20]' : 'border-[#D32F2F] bg-[#FBE4E2] text-[#9A1C1C]'}`}>{children}</p>
  );
}
