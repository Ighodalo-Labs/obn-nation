'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { draftFromListing, submitEdit, type EditSubmitDeps } from '@/lib/edit/submit';
import type { EditListing } from '@/lib/edit/core';
import { postJson } from '@/lib/auth/client';
import { validateStep2, type FieldErrors, type FormDraft } from '@/lib/listing/schema';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { DetailsFields } from './DetailsFields';
import { MediaStep } from './MediaStep';
import { categoryOptions } from './options';
import { CardChoice, pillButton, primaryButton } from './ui';
import { useMedia } from './useMedia';

type Signed = { photos: Record<string, string>; video: string | null };
type State = { phase: 'idle' } | { phase: 'sending'; done: number; total: number } | { phase: 'failed'; message: string; retry: boolean } | { phase: 'sent' };

/** The edit page form (PRD 6.4): the same fields as the new-listing form, pre-filled, with the reason on top. */
export function EditForm({ token, listing, signed }: { token: string; listing: EditListing; signed: Signed }) {
  const [draft, setDraft] = useState<FormDraft>(() => draftFromListing(listing));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [keptPhotos, setKeptPhotos] = useState<string[]>(listing.photo_urls);
  const [keptVideo, setKeptVideo] = useState<string | null>(listing.video_url);
  const [state, setState] = useState<State>({ phase: 'idle' });
  const media = useMedia(keptPhotos.length);

  const set = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }));
  };

  const newPhotos = media.photos.filter((p) => p.status === 'done' && p.file).map((p) => p.file as File);
  const hasVideo = Boolean(keptVideo) || media.video.status === 'done';
  const canSend = !media.busy && keptPhotos.length + newPhotos.length >= 1 && hasVideo && state.phase !== 'sending' && true;

  async function send() {
    const v = validateStep2(draft);
    if (!v.ok) return setErrors(v.errors);
    setErrors({});
    const supabase = createBrowserSupabase();
    const deps: EditSubmitDeps = {
      post: (url, body) => postJson(url, body),
      uploadSigned: async (bucket, path, t, file) => {
        const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(path, t, file, { contentType: bucket === 'photos' ? 'image/webp' : 'video/mp4' });
        return { error: error ? error.message : null };
      },
      onProgress: (done, total) => setState({ phase: 'sending', done, total }),
    };
    setState({ phase: 'sending', done: 0, total: newPhotos.length + (media.video.file ? 1 : 0) });
    try {
      const r = await submitEdit(deps, {
        token, original: listing, draft, keptPhotos, keptVideo,
        newPhotos, newVideo: keptVideo ? null : media.video.file ?? null,
      });
      setState(r.ok ? { phase: 'sent' } : { phase: 'failed', message: r.message, retry: r.retry });
    } catch {
      setState({ phase: 'failed', message: 'Upload stopped. Tap Try again.', retry: true });
    }
  }

  if (state.phase === 'sent') {
    return (
      <div className="flex flex-col gap-4 py-4" role="status">
        <span className="flex h-1.5 w-20 overflow-hidden rounded-full" aria-hidden="true"><i className="flex-1 bg-brand-red" /><i className="flex-1 bg-brand-green" /><i className="flex-1 bg-brand-blue" /></span>
        <h1 className="font-display text-[clamp(2.2rem,6vw,3.2rem)] font-bold leading-[1] tracking-[-0.01em]">Sent for review.</h1>
        <p className="max-w-sm text-lg text-[#6B655A]">Thank you. An admin will check your changes. This link cannot be used again.</p>
      </div>
    );
  }

  const sending = state.phase === 'sending';
  return (
    <form className="flex flex-col gap-6" noValidate onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <h1 className="font-display text-[clamp(1.9rem,5vw,2.6rem)] font-bold leading-[1.05] tracking-[-0.01em]">Fix your listing</h1>
      {listing.rejection_reason && (
        <div role="note" className="rounded-2xl border-2 border-[#C62828]/30 bg-[#FDECEA] p-4">
          <p className="text-sm font-bold uppercase tracking-wide text-[#7A1B16]">The admin said</p>
          <p className="mt-1 text-base font-semibold text-[#7A1B16]">{listing.rejection_reason}</p>
        </div>
      )}

      <CardChoice name="category" legend="Category" options={categoryOptions} value={draft.category} onChange={(v) => set('category', v)} error={errors.category} columns={4} />
      <DetailsFields draft={draft} errors={errors} set={set} />

      <MediaStep
        media={media}
        reserved={keptPhotos.length}
        existingPhotos={keptPhotos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2" aria-label="Current photos">
            {keptPhotos.map((p, i) => (
              <li key={p} className="relative aspect-square overflow-hidden rounded-2xl border-2 border-[#E2D9CA] bg-[#FAF7F2]">
                {signed.photos[p] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signed.photos[p]} alt={`Current photo ${i + 1}`} className="h-full w-full object-cover" />
                ) : <p className="p-2 text-xs text-[#6B655A]">Photo unavailable</p>}
                <button type="button" aria-label={`Remove current photo ${i + 1}`} onClick={() => setKeptPhotos((l) => l.filter((x) => x !== p))}
                  className="absolute right-0 top-0 flex h-12 w-12 items-start justify-end p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#16140F]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16140F] text-white transition-colors hover:bg-brand-red"><X size={16} aria-hidden="true" /></span>
                </button>
              </li>
            ))}
          </ul>
        )}
        existingVideo={keptVideo ? (
          <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#E2D9CA] bg-[#FAF7F2] p-3">
            {signed.video ? <video src={signed.video} controls playsInline className="max-h-56 w-full rounded" /> : <p className="text-sm text-[#6B655A]">Current video</p>}
            <button type="button" className={`${pillButton} self-end`} onClick={() => setKeptVideo(null)}>Remove video</button>
          </div>
        ) : undefined}
      />

      <div className="sticky bottom-0 z-20 -mx-5 -mb-5 flex flex-col gap-3 border-t border-[#EDE6D9] bg-white/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0">
        {state.phase === 'failed' && (
          <div role="alert" className="rounded-2xl border-2 border-[#C62828]/30 bg-[#FDECEA] p-4 text-sm text-[#7A1B16]">
            <b className="block text-base">We could not send it.</b>
            {state.message} Your changes are still here. Tap Try again.
          </div>
        )}
        {sending && (
          <div className="flex flex-col gap-2" aria-live="polite">
            <p className="text-sm font-semibold">{state.total > 0 ? `Uploading ${state.done} of ${state.total} files. Keep this page open.` : 'Sending…'}</p>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={state.total} aria-valuenow={state.done} className="h-3 overflow-hidden rounded-full bg-[#EDE6D9]">
              <div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${state.total ? (state.done / state.total) * 100 : 50}%` }} />
            </div>
          </div>
        )}
        <button type="submit" className={primaryButton} disabled={!canSend}>
          {sending ? 'Sending…' : state.phase === 'failed' ? 'Try again' : 'Resubmit listing'}
        </button>
        {!sending && !canSend && state.phase !== 'failed' && <p className="text-center text-sm text-[#6B655A]">You need at least one photo and one video.</p>}
      </div>
    </form>
  );
}
