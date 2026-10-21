import type { ReactNode } from 'react';

/** Seller screens use a light, warm look: paper background, ink text, white cards. Brand colours mark progress and actions. */
export const inputClass =
  'min-h-14 w-full rounded-2xl border-2 border-[#E2D9CA] bg-white px-4 py-3 text-base text-[#16140F] placeholder:text-[#8E8778] transition-colors hover:border-[#BDB3A1] focus:border-[#1565C0] focus:outline-none focus:ring-4 focus:ring-[#1565C0]/15 aria-[invalid=true]:border-[#C62828]';
export const primaryButton =
  'min-h-14 rounded-full bg-brand-red px-7 text-base font-bold text-white shadow-[0_12px_26px_-12px_rgba(211,47,47,.8)] transition-all hover:bg-[#16140F] hover:shadow-none active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:bg-brand-red disabled:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16140F]';
export const secondaryButton =
  'min-h-14 rounded-full border-2 border-[#16140F]/20 bg-white px-7 text-base font-bold text-[#16140F] transition-all hover:border-[#16140F] hover:bg-[#16140F] hover:text-white active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16140F]';
/** Small pill button for inline actions such as Change, Remove, Resend. */
export const pillButton =
  'inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#16140F]/15 bg-white px-5 text-sm font-bold text-[#16140F] transition-all hover:border-[#16140F] hover:bg-[#16140F] hover:text-white active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#16140F]/15 disabled:hover:bg-white disabled:hover:text-[#16140F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16140F]';

const STEP_NAMES = ['Where and what', 'Details', 'Photos and video'] as const;
const STEP_FILL = ['bg-brand-red', 'bg-brand-blue', 'bg-brand-green'] as const;
const STEP_TEXT = ['text-brand-red', 'text-brand-blue', 'text-brand-green'] as const;

/** Progress header: three named steps joined by a line, then the page title. */
export function StepHeader({ step, title }: { step: 1 | 2 | 3; title: string }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="sr-only" aria-label={`Step ${step} of 3`}>Step {step} of 3, {STEP_NAMES[step - 1]}</p>
      <ol className="flex items-start" aria-hidden="true">
        {STEP_NAMES.map((name, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={name} className={`flex items-start ${i < 2 ? 'flex-1' : ''}`}>
              <span className="flex w-16 flex-col items-center gap-1.5 text-center sm:w-24">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-extrabold transition-colors ${
                    done || current ? `${STEP_FILL[i]} text-white` : 'border-2 border-[#D5CCBB] bg-white text-[#8E8778]'
                  } ${current ? 'ring-4 ring-[#16140F]/10' : ''}`}
                >
                  {done ? '✓' : n}
                </span>
                <span className={`text-xs font-bold leading-tight ${current ? STEP_TEXT[i] : done ? 'text-[#16140F]' : 'text-[#8E8778]'}`}>{name}</span>
              </span>
              {i < 2 && <span className={`mt-5 h-1 flex-1 rounded-full ${done ? STEP_FILL[i] : 'bg-[#E8E0D2]'}`} />}
            </li>
          );
        })}
      </ol>
      <h1 className="font-display text-[clamp(1.9rem,5vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.035em]">{title}</h1>
    </div>
  );
}

export function Field({ id, label, hint, error, children }: { id: string; label: ReactNode; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-base font-bold">
        {label}
        {hint && <span className="text-sm font-normal text-[#6B655A]">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-[#B3261E]">
          {error}
        </p>
      )}
    </div>
  );
}

interface Option {
  value: string;
  label: string;
  icon: ReactNode;
}

/** Radio group drawn as large tiles. Real radio inputs underneath, so keyboards and screen readers work. */
export function CardChoice({
  name, legend, options, value, onChange, error, columns, disabled,
}: {
  name: string; legend: string; options: readonly Option[]; value: string | null; onChange: (v: string) => void;
  error?: string; columns: 1 | 2 | 3 | 4; disabled?: boolean;
}) {
  const grid = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[columns];
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-base font-bold">{legend}</legend>
      <div className={`grid gap-2.5 ${grid}`}>
        {options.map((o) => {
          const selected = value === o.value;
          const row = columns === 1;
          return (
            <label
              key={o.value}
              className={`relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 text-base transition-all focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#16140F] active:scale-[.98] ${
                row ? 'flex-row' : 'flex-col justify-center text-center text-sm'
              } ${
                selected
                  ? 'border-[#16140F] bg-[#16140F] text-white shadow-[0_14px_28px_-16px_rgba(22,20,15,.8)]'
                  : 'border-[#E2D9CA] bg-white text-[#16140F] hover:border-[#16140F] hover:bg-[#FFF6E5]'
              } ${disabled && !selected ? 'opacity-40' : ''}`}
            >
              <input type="radio" className="sr-only" name={name} value={o.value} checked={selected} onChange={() => onChange(o.value)} />
              {o.icon && <span aria-hidden="true" className={selected ? 'text-white' : 'text-[#6B655A]'}>{o.icon}</span>}
              <span className={row ? 'font-bold' : 'font-bold leading-tight'}>{o.label}</span>
              {selected && (
                <span aria-hidden="true" className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-extrabold text-[#16140F]">✓</span>
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-[#B3261E]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
