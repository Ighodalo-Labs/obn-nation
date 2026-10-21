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
import { CardChoice, StepHeader, pillButton, primaryButton, secondaryButton } from './ui';

/**
 * Step 3 shows photos and video (T08) and sends the listing (T09).
 * `lockedRegion` comes from the referral cookie on the server (T10). Until then it is always null.
 */
export function ListingForm({ lockedRegion }: { lockedRegion: string | null }) {
  const [form, setForm] = useState<SavedForm | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const heading = useRef<HTMLDivElement>(null);
  const failure = useRef<HTMLDivElement>(null);
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

  const failedNow = state.phase === 'failed';
  useEffect(() => {
    if (failedNow) failure.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [failedNow]);

  if (!form) return <p className="py-8 text-[#6B655A]">Loading…</p>;

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
    <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
      <div ref={heading} className="scroll-mt-24">
        <StepHeader step={step} title={step === 1 ? 'What are you selling?' : step === 2 ? 'Tell buyers about it' : 'Add photos'} />
      </div>

      {step > 1 && (
        <p className="flex w-fit flex-wrap items-center gap-3 rounded-full bg-[#FAF7F2] py-1.5 pl-5 pr-1.5 text-sm">
          <span className="font-extrabold">{regionOptions.find((r) => r.value === draft.region)?.label}</span>
          <span className="text-[#6B655A]">{categoryOptions.find((c) => c.value === draft.category)?.label}</span>
          <button type="button" className={`${pillButton} !min-h-12`} onClick={() => go(1)}>Change</button>
        </p>
      )}

      {step === 1 && (
        <>
          <CardChoice
            name="region" legend="Where are you?" options={regionOptions} value={draft.region}
            onChange={(v) => set('region', v)} error={errors.region} columns={1} disabled={Boolean(lockedRegion)}
          />
          {lockedRegion && <p className="-mt-4 text-sm text-[#6B655A]">Set by your link.</p>}
          <CardChoice
            name="category" legend="Category" options={categoryOptions} value={draft.category}
            onChange={(v) => set('category', v)} error={errors.category} columns={4}
          />
        </>
      )}

      {step === 2 && <DetailsFields draft={draft} errors={errors} set={set} />}

      {step === 3 && <MediaStep media={media} />}

      <div className="sticky bottom-0 z-20 -mx-5 -mb-5 flex flex-col gap-3 border-t border-[#EDE6D9] bg-white/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0">
        {step === 3 && state.phase === 'failed' && (
          <div ref={failure} role="alert" className="rounded-2xl border-2 border-[#C62828]/30 bg-[#FDECEA] p-4 text-sm text-[#7A1B16]">
            <b className="block text-base">We could not send it.</b>
            {state.message} Your photos and video are still here. Tap Try again.
          </div>
        )}
        {step === 3 && sending && (
          <div className="flex flex-col gap-2" aria-live="polite">
            <p className="text-sm font-semibold">Uploading {state.done} of {state.total} files. Keep this page open.</p>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={state.total} aria-valuenow={state.done} className="h-3 overflow-hidden rounded-full bg-[#EDE6D9]">
              <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${state.total ? (state.done / state.total) * 100 : 0}%` }} />
            </div>
          </div>
        )}
        <div className={`grid gap-3 ${step > 1 ? 'grid-cols-[1fr_2fr]' : 'grid-cols-1'}`}>
          {step > 1 && (
            <button type="button" className={secondaryButton} disabled={sending} onClick={() => go((step - 1) as 1 | 2)}>
              Back
            </button>
          )}
          {step < 3 && (
            <button type="submit" className={primaryButton}>
              Next
            </button>
          )}
          {step === 3 && (
            <button type="button" className={primaryButton} disabled={media.busy || media.ready < 1 || media.video.status !== 'done' || sending} onClick={submit}>
              {sending ? 'Sending…' : state.phase === 'failed' ? 'Try again' : 'Submit listing'}
            </button>
          )}
        </div>
        {step === 3 && !sending && state.phase !== 'failed' && (media.ready < 1 || media.video.status !== 'done') && (
          <p className="text-center text-sm text-[#6B655A]">Add at least one photo and one video to submit.</p>
        )}
      </div>
    </form>
  );
}
