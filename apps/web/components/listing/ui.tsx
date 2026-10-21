import type { ReactNode } from 'react';

export const inputClass =
  'min-h-12 w-full rounded-xl border border-border bg-bg px-3 py-3 text-base text-white placeholder:text-muted focus:border-tint-blue focus:outline-none focus:ring-2 focus:ring-tint-blue aria-[invalid=true]:border-tint-red';
export const primaryButton =
  'min-h-12 rounded-full bg-brand-red px-5 text-base font-semibold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
export const secondaryButton =
  'min-h-12 rounded-full border border-white/25 bg-transparent px-5 text-base font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

const STEP_NAMES = ['Where and what', 'Details', 'Photos and video'] as const;
const STEP_FILL = ['bg-brand-red', 'bg-brand-blue', 'bg-brand-green'] as const;

export function StepHeader({ step, title }: { step: 1 | 2 | 3; title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5" aria-hidden="true">
        {STEP_FILL.map((fill, i) => (
          <span key={fill} className={`h-1.5 flex-1 rounded-full ${i + 1 <= step ? fill : 'bg-border'}`} />
        ))}
      </div>
      <p className="text-sm text-muted" aria-label={`Step ${step} of 3`}>
        Step {step} of 3 <span aria-hidden="true">/ {STEP_NAMES[step - 1]}</span>
      </p>
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
    </div>
  );
}

export function Field({ id, label, hint, error, children }: { id: string; label: ReactNode; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-base">
        {label}
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-tint-red">
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

/** Radio group drawn as large cards. Real radio inputs underneath, so keyboards and screen readers work. */
export function CardChoice({
  name, legend, options, value, onChange, error, columns, disabled,
}: {
  name: string; legend: string; options: readonly Option[]; value: string | null; onChange: (v: string) => void;
  error?: string; columns: 1 | 2 | 3 | 4; disabled?: boolean;
}) {
  const grid = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[columns];
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 text-base">{legend}</legend>
      <div className={`grid gap-2 ${grid}`}>
        {options.map((o) => {
          const selected = value === o.value;
          const row = columns === 1;
          return (
            <label
              key={o.value}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-base focus-within:outline focus-within:outline-2 focus-within:outline-white ${
                row ? 'flex-row' : 'flex-col justify-center text-center text-sm'
              } ${selected ? 'border-brand-blue bg-[#10233a]' : 'border-border bg-surface'} ${disabled && !selected ? 'opacity-40' : ''}`}
            >
              <input type="radio" className="sr-only" name={name} value={o.value} checked={selected} onChange={() => onChange(o.value)} />
              <span aria-hidden="true" className={selected ? 'text-tint-blue' : 'text-muted'}>{o.icon}</span>
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-tint-red">
          {error}
        </p>
      )}
    </fieldset>
  );
}
