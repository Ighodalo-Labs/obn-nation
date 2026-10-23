'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Camera, Film, ImagePlus, Loader2, Plus, X } from 'lucide-react';
import { humanSize } from '@/lib/media/plan';
import { IMAGE_MAX_COUNT } from '@/lib/compression/images';
import type { MediaApi } from './useMedia';
import { pillButton } from './ui';

/** A big upload tile with a photo behind it. Hover brightens the photo and the label lifts. */
function PhotoTile({ src, label, hint, icon, disabled, onClick }: { src: string; label: string; hint: string; icon: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group relative flex min-h-32 flex-1 flex-col justify-end overflow-hidden rounded-2xl bg-[#16140F] p-4 text-left text-white transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-18px_rgba(22,20,15,.8)] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16140F]"
    >
      <Image src={src} alt="" fill sizes="(min-width:640px) 260px, 45vw" className="object-cover opacity-70 transition-all duration-500 group-hover:scale-105 group-hover:opacity-90" />
      <span className="absolute inset-0 bg-gradient-to-t from-[#16140F]/85 via-[#16140F]/20 to-transparent" aria-hidden="true" />
      <span className="relative flex items-center gap-2 text-lg font-bold">{icon}{label}</span>
      <span className="relative text-sm text-white/80">{hint}</span>
    </button>
  );
}

export function MediaStep({ media, reserved = 0, existingPhotos, existingVideo }: {
  media: MediaApi;
  /** Photos already on the listing (edit page). They use up slots. */
  reserved?: number;
  existingPhotos?: React.ReactNode;
  /** When set, the video picker is hidden and this is shown instead. */
  existingVideo?: React.ReactNode;
}) {
  // Fetch the video tool in the background while the seller takes photos.
  useEffect(() => {
    if (existingVideo) return;
    const t = window.setTimeout(() => { void import('@/lib/compression/video').then((m) => m.preloadVideoEngine()); }, 800);
    return () => window.clearTimeout(t);
  }, [existingVideo]);
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const videoGallery = useRef<HTMLInputElement>(null);
  const videoCamera = useRef<HTMLInputElement>(null);
  const { photos, video, notice } = media;
  const counted = photos.filter((p) => p.status !== 'error').length + reserved;
  const full = counted >= IMAGE_MAX_COUNT;
  const videoBusy = video.status === 'checking' || video.status === 'compressing';

  const pick = (fn: (files: File[]) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow choosing the same file again
    if (files.length) fn(files);
  };

  const empties = Math.max(0, Math.min(IMAGE_MAX_COUNT - counted, IMAGE_MAX_COUNT - photos.length - reserved));
  const slotsToShow = Math.min(empties, Math.max(0, 6 - photos.filter((p) => p.status !== 'error').length - reserved));

  return (
    <div className="flex flex-col gap-8">
      <p className="rounded-2xl bg-[#FFF6E5] px-4 py-3 text-sm text-[#5C4A1E]">Photos and video are not saved if you reload this page. You would add them again.</p>

      <section className="flex flex-col gap-3" aria-labelledby="photos-h">
        <h2 id="photos-h" className="flex items-baseline justify-between text-base font-bold">
          <span>Photos</span>
          <span className="text-sm font-normal text-[#6B655A]" aria-live="polite">{counted} of {IMAGE_MAX_COUNT} added</span>
        </h2>
        <p className="-mt-1 text-sm text-[#6B655A]">The first photo is the cover. Daylight and a clean background sell faster. Each photo is shrunk to under 1 MB.</p>
        <div className="flex gap-3">
          <PhotoTile src="/photos/devices.webp" label="Camera" hint="Take a photo now" icon={<Camera size={20} aria-hidden="true" />} disabled={full} onClick={() => camera.current?.click()} />
          <PhotoTile src="/photos/living-room.webp" label="Gallery" hint="Pick several at once" icon={<ImagePlus size={20} aria-hidden="true" />} disabled={full} onClick={() => gallery.current?.click()} />
        </div>
        <input ref={camera} className="sr-only" tabIndex={-1} aria-hidden="true" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={pick(media.addPhotos)} />
        <input ref={gallery} className="sr-only" tabIndex={-1} aria-hidden="true" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pick(media.addPhotos)} />
        {notice && <p role="alert" className="text-sm font-semibold text-[#B3261E]">{notice}</p>}

        {existingPhotos}
        {(photos.length > 0 || slotsToShow > 0) && (
          <ul className="grid grid-cols-3 gap-2.5">
            {photos.map((p, i) => (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-2xl border-2 border-[#E2D9CA] bg-[#FAF7F2]">
                {p.status === 'done' && p.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                )}
                {p.status === 'working' && (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-[#6B655A]">
                    <Loader2 size={20} className="animate-spin" aria-hidden="true" /> Preparing…
                  </div>
                )}
                {p.status === 'error' && <p role="alert" className="px-2 pb-8 pt-9 text-xs font-semibold text-[#B3261E]">{p.error}</p>}
                {i === 0 && p.status === 'done' && <span className="absolute left-2 top-2 rounded-full bg-[#16140F] px-2.5 py-1 text-xs font-bold text-white">Cover</span>}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-[#16140F]/75 px-2 py-1 text-xs text-white">
                  <span>{p.bytes ? humanSize(p.bytes) : ''}</span>
                </div>
                <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => media.removePhoto(p.id)}
                  className="absolute right-0 top-0 flex h-12 w-12 items-start justify-end p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#16140F]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#16140F] text-white transition-colors hover:bg-brand-red"><X size={16} aria-hidden="true" /></span>
                </button>
              </li>
            ))}
            {Array.from({ length: slotsToShow }, (_, i) => (
              <li key={`slot-${i}`}>
                <button type="button" disabled={full} onClick={() => gallery.current?.click()} aria-label={`Add photo ${photos.length + reserved + i + 1}`}
                  className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#CFC5B2] bg-[#FAF7F2] text-sm font-bold text-[#6B655A] transition-all hover:border-[#16140F] hover:bg-white hover:text-[#16140F] active:scale-[.97] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#16140F]">
                  <Plus size={22} aria-hidden="true" />
                  {photos.length + reserved + i === 0 ? 'Cover' : photos.length + reserved + i + 1}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="video-h">
        <h2 id="video-h" className="flex items-baseline justify-between text-base font-bold">
          <span>Video</span>
          <span className="text-sm font-normal text-[#6B655A]">required, up to 60 seconds</span>
        </h2>
        <p className="-mt-1 text-sm text-[#6B655A]">Show it working. Turn it on, walk around it, say what it is. Buyers trust a video.</p>
        {existingVideo}
        {!existingVideo && (video.status === 'idle' || video.status === 'error') ? (
          <div className="flex gap-3">
            <PhotoTile src="/photos/tv-wall.webp" label="Record" hint="Film it now" icon={<Film size={20} aria-hidden="true" />} onClick={() => videoCamera.current?.click()} />
            <PhotoTile src="/photos/kitchen.webp" label="Gallery" hint="Use a video you have" icon={<ImagePlus size={20} aria-hidden="true" />} onClick={() => videoGallery.current?.click()} />
          </div>
        ) : null}
        <input ref={videoCamera} className="sr-only" tabIndex={-1} aria-hidden="true" type="file" accept="video/*" capture="environment" onChange={pick((f) => media.addVideo(f[0]))} />
        <input ref={videoGallery} className="sr-only" tabIndex={-1} aria-hidden="true" type="file" accept="video/*" onChange={pick((f) => media.addVideo(f[0]))} />

        {video.status === 'error' && <p role="alert" className="text-sm font-semibold text-[#B3261E]">{video.error}</p>}

        {videoBusy && (
          <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#E2D9CA] bg-[#FAF7F2] p-4" aria-live="polite">
            <p className="flex justify-between text-sm font-semibold">
              <span>{video.status === 'checking' ? 'Checking video…' : 'Shrinking video…'}</span>
              <span>{video.status === 'compressing' ? `${video.percent}%` : ''}</span>
            </p>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={video.percent} className="h-3 overflow-hidden rounded-full bg-[#EDE6D9]">
              <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${video.percent}%` }} />
            </div>
            <button type="button" className={pillButton} onClick={media.cancelVideo}>Cancel</button>
          </div>
        )}

        {video.status === 'done' && video.url && (
          <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#E2D9CA] bg-[#FAF7F2] p-3">
            <video src={video.url} controls playsInline className="max-h-64 w-full rounded-xl bg-black" />
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[#2E7D32]">Ready · MP4, {humanSize(video.bytes ?? 0)}</span>
              <button type="button" className={pillButton} onClick={media.removeVideo}>Remove video</button>
            </div>
          </div>
        )}
        <p className="text-sm text-[#6B655A]">The result is an MP4 under 10 MB. A video is needed to submit.</p>
      </section>
    </div>
  );
}
