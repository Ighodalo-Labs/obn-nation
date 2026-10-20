'use client';

import { useRef } from 'react';
import { Camera, Film, ImagePlus, Loader2, X } from 'lucide-react';
import { humanSize } from '@/lib/media/plan';
import { IMAGE_MAX_COUNT } from '@/lib/compression/images';
import type { MediaApi } from './useMedia';
import { secondaryButton } from './ui';

const tile = 'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

export function MediaStep({ media }: { media: MediaApi }) {
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const videoGallery = useRef<HTMLInputElement>(null);
  const videoCamera = useRef<HTMLInputElement>(null);
  const { photos, video, notice } = media;
  const counted = photos.filter((p) => p.status !== 'error').length;
  const full = counted >= IMAGE_MAX_COUNT;
  const videoBusy = video.status === 'checking' || video.status === 'compressing';

  const pick = (fn: (files: File[]) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow choosing the same file again
    if (files.length) fn(files);
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">Photos and video are not saved if you reload this page. You would add them again.</p>

      <section className="flex flex-col gap-3" aria-labelledby="photos-h">
        <h2 id="photos-h" className="text-base">Photos <span className="text-sm text-muted">(1 to {IMAGE_MAX_COUNT})</span></h2>
        <div className="flex gap-2">
          <button type="button" className={tile} disabled={full} onClick={() => camera.current?.click()}>
            <Camera size={20} aria-hidden="true" /> Camera
          </button>
          <button type="button" className={tile} disabled={full} onClick={() => gallery.current?.click()}>
            <ImagePlus size={20} aria-hidden="true" /> Gallery
          </button>
        </div>
        <input ref={camera} className="sr-only" tabIndex={-1} aria-hidden="true" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={pick(media.addPhotos)} />
        <input ref={gallery} className="sr-only" tabIndex={-1} aria-hidden="true" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pick(media.addPhotos)} />
        <p className="text-sm text-muted" aria-live="polite">{counted} of {IMAGE_MAX_COUNT} photos added. Each photo is shrunk to under 1 MB.</p>
        {notice && <p role="alert" className="text-sm text-tint-red">{notice}</p>}

        {photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface">
                {p.status === 'done' && p.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                )}
                {p.status === 'working' && (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-muted">
                    <Loader2 size={20} className="animate-spin" aria-hidden="true" /> Preparing…
                  </div>
                )}
                {p.status === 'error' && <p role="alert" className="px-2 pb-8 pt-9 text-xs text-tint-red">{p.error}</p>}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-2 py-1 text-xs">
                  <span>{p.bytes ? humanSize(p.bytes) : ''}</span>
                </div>
                <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => media.removePhoto(p.id)}
                  className="absolute right-1 top-1 flex h-12 w-12 items-start justify-end p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/80"><X size={16} aria-hidden="true" /></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="video-h">
        <h2 id="video-h" className="text-base">Video <span className="text-sm text-muted">(required, up to 60 seconds)</span></h2>
        {video.status === 'idle' || video.status === 'error' ? (
          <div className="flex gap-2">
            <button type="button" className={tile} onClick={() => videoCamera.current?.click()}>
              <Film size={20} aria-hidden="true" /> Record
            </button>
            <button type="button" className={tile} onClick={() => videoGallery.current?.click()}>
              <ImagePlus size={20} aria-hidden="true" /> Gallery
            </button>
          </div>
        ) : null}
        <input ref={videoCamera} className="sr-only" tabIndex={-1} aria-hidden="true" type="file" accept="video/*" capture="environment" onChange={pick((f) => media.addVideo(f[0]))} />
        <input ref={videoGallery} className="sr-only" tabIndex={-1} aria-hidden="true" type="file" accept="video/*" onChange={pick((f) => media.addVideo(f[0]))} />

        {video.status === 'error' && <p role="alert" className="text-sm text-tint-red">{video.error}</p>}

        {videoBusy && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3" aria-live="polite">
            <p className="flex justify-between text-sm">
              <span>{video.status === 'checking' ? 'Checking video…' : 'Shrinking video…'}</span>
              <span>{video.status === 'compressing' ? `${video.percent}%` : ''}</span>
            </p>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={video.percent} className="h-2 overflow-hidden rounded bg-border">
              <div className="h-full bg-tint-blue" style={{ width: `${video.percent}%` }} />
            </div>
            <button type="button" className={secondaryButton} onClick={media.cancelVideo}>Cancel</button>
          </div>
        )}

        {video.status === 'done' && video.url && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
            <video src={video.url} controls playsInline className="max-h-56 w-full rounded" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">MP4, {humanSize(video.bytes ?? 0)}</span>
              <button type="button" className="min-h-12 text-tint-blue underline" onClick={media.removeVideo}>Remove video</button>
            </div>
          </div>
        )}
        <p className="text-sm text-muted">The result is an MP4 under 10 MB. A video is needed to submit.</p>
      </section>
    </div>
  );
}
