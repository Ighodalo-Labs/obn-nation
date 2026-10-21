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

const COLOR: Record<Exclude<Tone, 'mute'>, string> = { green: '#2E7D32', blue: '#1565C0', red: '#D32F2F', amber: '#F5B942' };

export function StatCard({ label, value, hint, tone = 'blue' }: { label: string; value: ReactNode; hint?: string; tone?: Exclude<Tone, 'mute'> }) {
  return (
    <div className="ops-card ops-stat" style={{ ['--c' as string]: COLOR[tone] }}>
      <p className="ops-mute text-xs font-semibold uppercase tracking-[0.14em]">{label}</p>
      <p className="font-display mt-1 text-3xl font-extrabold leading-none tracking-tight">{value}</p>
      {hint && <p className="ops-mute mt-2 text-xs">{hint}</p>}
    </div>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="ops-mute mt-1 text-sm" aria-live="polite">{sub}</p>}
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
    <div className="fixed inset-0 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" style={{ zIndex: z }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="ops-card ops-pop ops-scroll flex max-h-[92vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-b-none p-5 sm:rounded-2xl">
        <h2 className="font-display text-xl font-extrabold tracking-tight">{title}</h2>
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
      <div className="text-[15px] leading-relaxed text-[#C7CEDB]">{body}</div>
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
  ) : <div className={`${size} flex-none rounded-xl bg-[#1B2436]`} aria-hidden="true" />;
}

export function Notice({ kind, children }: { kind: 'ok' | 'error'; children: ReactNode }) {
  return (
    <p role={kind === 'ok' ? 'status' : 'alert'} className={`rounded-xl border px-4 py-3 text-[15px] ${kind === 'ok' ? 'border-[#2E7D32]/50 bg-[#2E7D32]/15 text-[#81C784]' : 'border-[#D32F2F]/50 bg-[#D32F2F]/15 text-[#FF8A80]'}`}>{children}</p>
  );
}
