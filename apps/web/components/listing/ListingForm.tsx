'use client';

import { useEffect, useRef, useState } from 'react';
import { loadForm, saveForm, type SavedForm } from '@/lib/listing/draft';
import {
  validateStep1, validateStep2, type FieldErrors, type FormDraft,
} from '@/lib/listing/schema';
import { DetailsFields } from './DetailsFields';
import { MediaStep } from './MediaStep';
import { useMedia } from './useMedia';
import { useSubmit } from './useSubmit';
import { UnderReview } from './UnderReview';
import { categoryOptions, regionOptions } from './options';
import { CardChoice, StepHeader, primaryButton, secondaryButton } from './ui';

/**
 * Step 3 shows photos and video (T08) and sends the listing (T09).
 * `lockedRegion` comes from the referral cookie on the server (T10). Until then it is always null.
 */
export function ListingForm({ lockedRegion }: { lockedRegion: string | null }) {
  const [form, setForm] = useState<SavedForm | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const heading = useRef<HTMLDivElement>(null);
  const media = useMedia();
  const { state, submit } = useSubmit(form, media);

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

  if (state.phase === 'sent') {
    // The saved form was cleared. A reload gives a blank form with a new client_key.
    return <UnderReview onAnother={() => window.location.assign('/list/form')} />;
  }
  const sending = state.phase === 'sending';

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
      <div ref={heading} className="scroll-mt-24">
        <StepHeader step={step} title={step === 1 ? 'What are you selling?' : step === 2 ? 'Tell buyers about it' : 'Add photos'} />
      </div>

      {step > 1 && (
        <p className="flex w-fit flex-wrap items-center gap-2 rounded-full border border-white/10 bg-bg px-4 py-2 text-sm">
          <span className="font-semibold">{regionOptions.find((r) => r.value === draft.region)?.label}</span>
          <span className="text-muted">{categoryOptions.find((c) => c.value === draft.category)?.label}</span>
          <button type="button" className="inline-flex min-h-8 items-center rounded-full border border-white/25 px-3 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10" onClick={() => go(1)}>Change</button>
        </p>
      )}

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

      {step === 2 && <DetailsFields draft={draft} errors={errors} set={set} />}

      {step === 3 && <MediaStep media={media} />}

      <div className={`sticky bottom-0 z-20 -mx-4 grid gap-3 border-t border-white/10 bg-surface/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 ${step > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
        {step === 3 && (
          <button type="button" className={primaryButton} disabled={media.busy || media.ready < 1 || media.video.status !== 'done' || sending || (state.phase === 'failed' && !state.retry)} onClick={submit}>
            {sending ? 'Sending…' : state.phase === 'failed' && state.retry ? 'Try again' : 'Submit listing'}
          </button>
        )}
      </div>
      {step === 3 && sending && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="text-sm">Uploading {state.done} of {state.total} files. Keep this page open.</p>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={state.total} aria-valuenow={state.done} className="h-2 overflow-hidden rounded bg-border">
            <div className="h-full bg-tint-blue" style={{ width: `${state.total ? (state.done / state.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}
      {step === 3 && state.phase === 'failed' && <p role="alert" className="text-sm text-tint-red">{state.message}</p>}
      {step === 3 && !sending && (media.ready < 1 || media.video.status !== 'done') && (
        <p className="text-sm text-muted">Add at least one photo and one video to submit.</p>
      )}
    </form>
  );
}
