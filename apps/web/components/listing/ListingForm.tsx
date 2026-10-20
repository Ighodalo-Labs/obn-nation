'use client';

import { useEffect, useRef, useState } from 'react';
import { loadForm, saveForm, type SavedForm } from '@/lib/listing/draft';
import {
  formatPrice, priceDigits, validateStep1, validateStep2, type FieldErrors, type FormDraft,
} from '@/lib/listing/schema';
import { ageOptions, categoryOptions, regionOptions, workOptions } from './options';
import { CardChoice, Field, StepHeader, inputClass, primaryButton, secondaryButton } from './ui';

/**
 * Steps 1 and 2 are complete. Step 3 (photos, video, submit) is added in T08 and T09.
 * `lockedRegion` comes from the referral cookie on the server (T10). Until then it is always null.
 */
export function ListingForm({ lockedRegion }: { lockedRegion: string | null }) {
  const [form, setForm] = useState<SavedForm | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const heading = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadForm();
    if (lockedRegion) saved.draft.region = lockedRegion;
    setForm(saved);
  }, [lockedRegion]);

  useEffect(() => {
    if (form) saveForm(form);
  }, [form]);

  useEffect(() => {
    heading.current?.scrollIntoView?.({ block: 'start' });
  }, [form?.step]);

  if (!form) return <p className="py-8 text-muted">Loading…</p>;

  const { draft, step } = form;
  const set = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setForm({ ...form, draft: { ...draft, [key]: value } });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };
  const go = (to: 1 | 2 | 3) => {
    setErrors({});
    setForm({ ...form, step: to });
  };

  function next() {
    if (step === 1) {
      const r = validateStep1(draft);
      return r.ok ? go(2) : setErrors(r.errors);
    }
    if (step === 2) {
      const r = validateStep2(draft);
      return r.ok ? go(3) : setErrors(r.errors);
    }
  }

  return (
    <form className="flex flex-col gap-5 pb-10" onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
      <div ref={heading}>
        <StepHeader step={step} title={step === 1 ? 'What are you selling?' : step === 2 ? 'Tell buyers about it' : 'Add photos'} />
      </div>

      {step === 1 && (
        <>
          <CardChoice
            name="region" legend="Where are you?" options={regionOptions} value={draft.region}
            onChange={(v) => set('region', v)} error={errors.region} columns={1} disabled={Boolean(lockedRegion)}
          />
          {lockedRegion && <p className="-mt-3 text-sm text-muted">Set by your link.</p>}
          <CardChoice
            name="category" legend="Category" options={categoryOptions} value={draft.category}
            onChange={(v) => set('category', v)} error={errors.category} columns={4}
          />
        </>
      )}

      {step === 2 && (
        <>
          <Field id="title" label="Title" error={errors.title}>
            <input id="title" className={inputClass} type="text" maxLength={80} value={draft.title} placeholder="Samsung double door fridge"
              aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined}
              onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field id="description" label="Description" hint={`${draft.description.length} / 1000`} error={errors.description}>
            <textarea id="description" className={`${inputClass} min-h-28`} rows={4} maxLength={1000} value={draft.description}
              placeholder="What it is, how old it is, what comes with it."
              aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-error' : undefined}
              onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field id="brand" label="Brand" hint="optional" error={errors.brand}>
            <input id="brand" className={inputClass} type="text" maxLength={60} value={draft.brand} onChange={(e) => set('brand', e.target.value)} />
          </Field>
          <Field id="model" label="Model" hint="optional" error={errors.model}>
            <input id="model" className={inputClass} type="text" maxLength={60} value={draft.model} onChange={(e) => set('model', e.target.value)} />
          </Field>
          <Field id="size" label="Size" hint="optional, like 43 inch or 2.5 kVA" error={errors.size}>
            <input id="size" className={inputClass} type="text" maxLength={60} value={draft.size} onChange={(e) => set('size', e.target.value)} />
          </Field>
          <CardChoice name="age" legend="Age of item" options={ageOptions} value={draft.condition_age}
            onChange={(v) => set('condition_age', v)} error={errors.condition_age} columns={1} />
          <CardChoice name="work" legend="Working status" options={workOptions} value={draft.condition_work}
            onChange={(v) => set('condition_work', v)} error={errors.condition_work} columns={3} />
          <Field id="price" label="Price" error={errors.price}>
            <div className="flex gap-2">
              <span className="flex min-h-12 items-center rounded-lg border border-border bg-surface px-3 text-base text-muted">₦</span>
              <input id="price" className={inputClass} type="text" inputMode="numeric" autoComplete="off" placeholder="150,000"
                value={formatPrice(draft.price)} aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? 'price-error' : undefined}
                onChange={(e) => set('price', priceDigits(e.target.value))} />
            </div>
          </Field>
        </>
      )}

      {step === 3 && (
        <p className="rounded-lg border border-border bg-surface p-4 text-muted">
          Photos and video come next in the build (T08 and T09). Your answers are saved.
        </p>
      )}

      <div className={`grid gap-3 ${step > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {step > 1 && (
          <button type="button" className={secondaryButton} onClick={() => go((step - 1) as 1 | 2)}>
            Back
          </button>
        )}
        {step < 3 && (
          <button type="submit" className={primaryButton}>
            Next
          </button>
        )}
      </div>
    </form>
  );
}
