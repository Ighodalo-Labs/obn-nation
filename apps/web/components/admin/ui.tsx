'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { AGES, CATEGORIES, REGIONS, WORKING } from '@/lib/listing/schema';

/** Shared bits for the admin console (Shopify Polaris style): look-up helpers, page, card, badge, banner, toast, dialog. */
export const labelOf = (list: readonly { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;
export const categoryLabel = (v: string) => labelOf(CATEGORIES, v);
export const regionLabelOf = (v: string | null) => (v ? labelOf(REGIONS, v) : '');
export const ageLabel = (v: string) => labelOf(AGES, v);
export const workingLabel = (v: string) => labelOf(WORKING, v);

export type Tone = 'green' | 'blue' | 'red' | 'amber' | 'mute';

export function Badge({ tone, children, plain = false }: { tone: Tone; children: ReactNode; plain?: boolean }) {
  return <span className={`ops-badge ops-b-${tone}${plain ? ' ops-badge-plain' : ''}`}>{children}</span>;
}

/** Page: title, one line of text, secondary actions at the top right, then stacked cards. */
export function Page({ title, sub, actions, children }: { title: string; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="ops-page">
      <div className="ops-pagehead">
        <div className="min-w-0">
          <h1 className="ops-title">{title}</h1>
          {sub && <p className="ops-sub" aria-live="polite">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, actions, children, className = '', id, pad = true, label }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string; pad?: boolean; label?: string;
}) {
  return (
    <section id={id} aria-label={label} className={`ops-card ops-section ${className}`}>
      {(title || actions) && (
        <div className="ops-card-h">
          {title ? <h2 className="ops-card-t">{title}</h2> : <span />}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {pad ? <div className="ops-card-b">{children}</div> : children}
    </section>
  );
}

/** A row of figures inside one card, split by hairlines. */
export function Metrics({ items, five = false }: { items: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'crit' | 'ok' | 'warn' | 'info' }[]; five?: boolean }) {
  return (
    <section className="ops-card" aria-label="Summary">
      <div className={`ops-metrics${five ? ' ops-m5' : ''}`}>
        {items.map((m) => (
          <div key={m.label} className="ops-metric" data-tone={m.tone}>
            <p className="ops-metric-l"><i aria-hidden="true" />{m.label}</p>
            <p className="ops-metric-v">{m.value}</p>
            {m.hint && <p className="ops-metric-h">{m.hint}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export function Banner({ tone = 'info', children, onDismiss, title }: { tone?: 'info' | 'ok' | 'crit' | 'warn'; children?: ReactNode; onDismiss?: () => void; title?: string }) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle;
  return (
    <div className="ops-banner" data-tone={tone} role={tone === 'crit' ? 'alert' : 'status'}>
      <Icon size={16} aria-hidden="true" />
      <div className="min-w-0 flex-1">{title && <p className="font-semibold">{title}</p>}{children}</div>
      {onDismiss && <button type="button" className="ops-btn ops-btn-plain ops-btn-icon !h-6 !min-h-0 !w-6 !text-inherit" onClick={onDismiss} aria-label="Dismiss"><X size={14} aria-hidden="true" /></button>}
    </div>
  );
}

/** Kept for call sites that only need a message line. */
export function Notice({ kind, children }: { kind: 'ok' | 'error'; children: ReactNode }) {
  return <Banner tone={kind === 'ok' ? 'ok' : 'crit'}>{children}</Banner>;
}

export function Toast({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="ops-toast" role="status">
      <span>{children}</span>
      <button type="button" className="ops-btn ops-btn-plain !min-h-0 !h-6 !px-1 !text-inherit" onClick={onClose} aria-label="Dismiss"><X size={14} aria-hidden="true" /></button>
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
    <div className="ops-scrim admin-theme-scope flex items-end justify-center p-0 sm:items-center sm:p-4" style={{ zIndex: z }}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="ops-modal ops-scroll flex max-h-[92vh] w-full max-w-[460px] flex-col gap-3 overflow-y-auto rounded-t-xl p-4 sm:rounded-xl sm:p-5">
        <h2 className="text-base font-semibold">{title}</h2>
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
      <div className="text-[13px] leading-5">{body}</div>
      <div className="flex justify-end gap-2">
        <button type="button" className="ops-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" data-autofocus className={`ops-btn ${tone === 'red' ? 'ops-btn-red' : 'ops-btn-primary'}`} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
      </div>
    </Dialog>
  );
}

export function Thumb({ src, large = false }: { src?: string; large?: boolean }) {
  const cls = `ops-thumb${large ? ' ops-thumb-l' : ''}`;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cls} />
  ) : <span className={`${cls} ops-thumbph`} aria-hidden="true">
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2.5" y="3.5" width="15" height="13" rx="2" /><circle cx="7" cy="8" r="1.4" /><path d="m3 15 4.5-4.5L11 14l2.5-2.5L17 15" /></svg>
  </span>;
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="ops-empty">
      <span className="ops-empty-ic" aria-hidden="true">{icon}</span>
      <p className="font-semibold">{title}</p>
      {children && <p className="ops-mute max-w-sm text-[13px]">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
