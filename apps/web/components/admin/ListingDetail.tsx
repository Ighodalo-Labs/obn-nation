'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ShieldAlert, X } from 'lucide-react';
import { badgeOf, naira, waitingFor, type FeedRow } from '@/lib/admin/inbox';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { ageLabel, Badge, categoryLabel, regionLabelOf, workingLabel } from './ui';

/** Full listing view (PRD AD-3): gallery, video, all fields, masked seller card, actions. Side drawer on desktop, full screen on phones. */
export function ListingDetail({ row, me, busy, now, onClose, onClaim, onApprove, onReject, onPrev, onNext }: {
  row: FeedRow; me: string; busy: boolean; now: number; onClose: () => void; onClaim: () => void; onApprove: () => void; onReject: () => void;
  onPrev?: () => void; onNext?: () => void;
}) {
  const [photos, setPhotos] = useState<string[] | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [videoBad, setVideoBad] = useState(false);
  const [active, setActive] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { closeRef.current?.focus(); }, [row.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]:not([data-drawer])')) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, a - 1));
      if (e.key === 'ArrowRight') setActive((a) => a + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    setPhotos(null); setVideo(null); setVideoBad(false); setActive(0);
    const db = createBrowserSupabase();
    (async () => {
      const p = await db.storage.from('photos').createSignedUrls(row.photo_urls, 3600);
      if (live) setPhotos((p.data ?? []).map((s) => s.signedUrl).filter(Boolean) as string[]);
      if (row.video_url) {
        const v = await db.storage.from('videos').createSignedUrl(row.video_url, 3600);
        if (live) v.data?.signedUrl ? setVideo(v.data.signedUrl) : setVideoBad(true);
      }
    })().catch(() => { if (live) { setPhotos([]); setVideoBad(Boolean(row.video_url)); } });
    return () => { live = false; };
  }, [row.id, row.photo_urls, row.video_url]);

  const facts: [string, string | null][] = [
    ['Category', categoryLabel(row.category)], ['Region', regionLabelOf(row.region)], ['Age', ageLabel(row.condition_age)],
    ['Working', workingLabel(row.condition_work)], ['Brand', row.brand], ['Model', row.model], ['Size', row.size],
  ];
  const pending = row.status === 'pending_review';
  const idx = photos ? Math.min(active, photos.length - 1) : 0;
  const badge = badgeOf(row, me);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" data-drawer aria-label={row.title} className="ops-drawer flex h-full w-full max-w-[560px] flex-col overflow-hidden border-l border-[#232C3D] bg-[#0E1219] text-[#E6EAF2]">
        <div className="flex items-center gap-2 border-b border-[#232C3D] px-4 py-3">
          <Badge tone={badge === 'Unclaimed' ? 'amber' : badge === 'Assigned to you' ? 'green' : 'mute'}>{badge}</Badge>
          {pending && <span className="ops-mute text-xs">Waiting {waitingFor(row.submitted_at, now)}</span>}
          <span className="ml-auto flex items-center gap-1">
            {onPrev && <button type="button" onClick={onPrev} aria-label="Previous listing" className="ops-btn !min-h-10 !w-10 !px-0"><ChevronLeft size={18} aria-hidden="true" /></button>}
            {onNext && <button type="button" onClick={onNext} aria-label="Next listing" className="ops-btn !min-h-10 !w-10 !px-0"><ChevronRight size={18} aria-hidden="true" /></button>}
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="ops-btn !min-h-10 !w-10 !px-0"><X size={18} aria-hidden="true" /></button>
          </span>
        </div>

        <div className="ops-scroll flex flex-1 flex-col gap-5 overflow-y-auto p-4 pb-6">
          {photos === null && <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-[#182030]" aria-label="Loading photos" />}
          {photos && photos.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="relative overflow-hidden rounded-2xl bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photos[idx]} alt={`Photo ${idx + 1} of ${photos.length}`} className="aspect-[4/3] w-full object-contain" />
                <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs">{idx + 1} / {photos.length}</span>
              </div>
              {photos.length > 1 && (
                <ul className="flex gap-2 overflow-x-auto" aria-label="Photos">
                  {photos.map((u, i) => (
                    <li key={u} className="flex-none">
                      <button type="button" onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === idx} className={`block overflow-hidden rounded-lg border-2 ${i === idx ? 'border-[#42A5F5]' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="" className="h-16 w-16 object-cover" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {photos && photos.length === 0 && <p className="text-[#FF8A80]">Photos could not be loaded.</p>}

          {row.video_url && (videoBad ? (
            <p className="ops-card2 p-3 text-sm ops-mute">Video unavailable</p>
          ) : video ? (
            <video src={video} controls playsInline className="max-h-72 w-full rounded-2xl bg-black" onError={() => setVideoBad(true)} />
          ) : <div className="h-24 w-full animate-pulse rounded-2xl bg-[#182030]" aria-label="Loading video" />)}

          <div>
            <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight">{row.title}</h2>
            <p className="font-display mt-1 text-xl font-bold text-[#66BB6A]">{naira(row.price_ngn)}</p>
          </div>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#C7CEDB]">{row.description}</p>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="ops-card2 px-3 py-2"><dt className="ops-mute text-xs">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
          </dl>
          <div className="ops-card2 p-4 text-sm">
            <p className="ops-mute text-xs uppercase tracking-[0.14em]">Seller</p>
            <p className="mt-1 text-base font-semibold">{row.seller_name}</p>
            <p>{row.seller_phone}</p>
            {!row.contact_visible && (
              <p className="ops-mute mt-2 flex items-start gap-2"><ShieldAlert size={16} className="mt-0.5 flex-none" aria-hidden="true" />Full details show once you are in charge of this listing.</p>
            )}
          </div>
        </div>

        {pending && (
          <div className="grid grid-cols-3 gap-2 border-t border-[#232C3D] bg-[#0E1219] p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <button type="button" className="ops-btn ops-btn-stop" disabled={busy} onClick={onReject}>Reject <span className="ops-kbd hidden md:inline-flex">R</span></button>
            {row.assigned_admin_id === null ? (
              <button type="button" className="ops-btn" disabled={busy} onClick={onClaim}>Claim <span className="ops-kbd hidden md:inline-flex">C</span></button>
            ) : <button type="button" className="ops-btn" onClick={onClose}>Close</button>}
            <button type="button" className="ops-btn ops-btn-go" disabled={busy} onClick={onApprove}>Approve <span className="ops-kbd hidden md:inline-flex">A</span></button>
          </div>
        )}
      </div>
    </div>
  );
}
