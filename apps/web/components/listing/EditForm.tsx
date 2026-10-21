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
import { CardChoice, primaryButton } from './ui';
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
  const canSend = !media.busy && keptPhotos.length + newPhotos.length >= 1 && hasVideo && state.phase !== 'sending' && !(state.phase === 'failed' && !state.retry);

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
      <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
        <h1 className="text-2xl">Sent for review</h1>
        <p className="max-w-sm text-muted">Thank you. An admin will check your changes. This link cannot be used again.</p>
      </div>
    );
  }

  const sending = state.phase === 'sending';
  return (
    <form className="flex flex-col gap-5 pb-10" noValidate onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <h1 className="text-2xl">Fix your listing</h1>
      {listing.rejection_reason && (
        <div role="note" className="rounded-xl border border-tint-red bg-bg p-3">
          <p className="text-sm text-muted">The admin said</p>
          <p className="text-base text-tint-red">{listing.rejection_reason}</p>
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
              <li key={p} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-bg">
                {signed.photos[p] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signed.photos[p]} alt={`Current photo ${i + 1}`} className="h-full w-full object-cover" />
                ) : <p className="p-2 text-xs text-muted">Photo unavailable</p>}
                <button type="button" aria-label={`Remove current photo ${i + 1}`} onClick={() => setKeptPhotos((l) => l.filter((x) => x !== p))}
                  className="absolute right-1 top-1 flex h-12 w-12 items-start justify-end p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/80"><X size={16} aria-hidden="true" /></span>
                </button>
              </li>
            ))}
          </ul>
        )}
        existingVideo={keptVideo ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg p-3">
            {signed.video ? <video src={signed.video} controls playsInline className="max-h-56 w-full rounded" /> : <p className="text-sm text-muted">Current video</p>}
            <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/25 disabled:hover:bg-transparent self-end" onClick={() => setKeptVideo(null)}>Remove video</button>
          </div>
        ) : undefined}
      />

      {sending && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="text-sm">{state.total > 0 ? `Uploading ${state.done} of ${state.total} files. Keep this page open.` : 'Sending…'}</p>
          <div role="progressbar" aria-valuemin={0} aria-valuemax={state.total} aria-valuenow={state.done} className="h-2 overflow-hidden rounded bg-border">
            <div className="h-full bg-tint-blue" style={{ width: `${state.total ? (state.done / state.total) * 100 : 50}%` }} />
          </div>
        </div>
      )}
      {state.phase === 'failed' && <p role="alert" className="text-sm text-tint-red">{state.message}</p>}
      {!sending && !canSend && state.phase !== 'failed' && <p className="text-sm text-muted">You need at least one photo and one video.</p>}
      <button type="submit" className={primaryButton} disabled={!canSend}>
        {sending ? 'Sending…' : state.phase === 'failed' && state.retry ? 'Try again' : 'Resubmit listing'}
      </button>
    </form>
  );
}
