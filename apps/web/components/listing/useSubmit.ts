'use client';

import { useCallback, useRef, useState } from 'react';
import { postJson } from '@/lib/auth/client';
import { clearForm, type SavedForm } from '@/lib/listing/draft';
import { submitListing, type SubmitDeps } from '@/lib/listing/submit';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import type { MediaApi } from './useMedia';

export type SubmitState =
  | { phase: 'idle' }
  | { phase: 'sending'; done: number; total: number }
  | { phase: 'failed'; message: string; retry: boolean; code: string }
  | { phase: 'sent' };

/** Runs the create, upload and submit steps (PRD FM-7 to FM-10). Tapping Try again reuses the same client_key. */
export function useSubmit(form: SavedForm | null, media: MediaApi) {
  const [state, setState] = useState<SubmitState>({ phase: 'idle' });
  const running = useRef(false);

  const submit = useCallback(async () => {
    if (!form || running.current) return; // ignore double taps
    const photos = media.photos.filter((p) => p.status === 'done' && p.file).map((p) => p.file as File);
    const video = media.video.file;
    if (photos.length === 0 || !video) return;
    running.current = true;
    setState({ phase: 'sending', done: 0, total: photos.length + 1 });
    const supabase = createBrowserSupabase();
    const deps: SubmitDeps = {
      post: (body) => postJson('/api/listings/create', body),
      upload: async (bucket, path, file) => {
        const { error } = await supabase.storage.from(bucket).upload(path, file, {
          upsert: true,
          contentType: bucket === 'photos' ? 'image/webp' : 'video/mp4',
        });
        return { error: error ? error.message : null };
      },
      onProgress: (done, total) => setState({ phase: 'sending', done, total }),
    };
    try {
      const r = await submitListing(deps, { clientKey: form.clientKey, draft: form.draft, photos, video });
      if (r.ok) {
        clearForm(); // "List another item" starts clean with a new client_key
        setState({ phase: 'sent' });
      } else {
        setState({ phase: 'failed', message: r.message, retry: r.retry, code: r.code });
      }
    } catch {
      setState({ phase: 'failed', message: 'Upload stopped. Tap Try again.', retry: true, code: 'upload_failed' });
    } finally {
      running.current = false;
    }
  }, [form, media.photos, media.video.file]);

  return { state, submit };
}
