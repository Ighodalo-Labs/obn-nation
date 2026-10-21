'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ShieldAlert, X } from 'lucide-react';
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
  const [checks, setChecks] = useState<string[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const toggle = (c: string) => setChecks((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  useEffect(() => { setChecks([]); }, [row.id]);

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
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0A0A0A]/60 backdrop-blur-[3px]" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" data-drawer aria-label={row.title} className="ops-drawer flex h-full w-full max-w-[580px] flex-col overflow-hidden bg-[var(--o-card)] text-[var(--o-ink)] shadow-[-30px_0_60px_-30px_rgba(0,0,0,.6)] sm:rounded-l-[32px]">
        <div className="flex items-center gap-2 bg-[var(--o-card2)] px-5 py-3">
          <span className="ops-eyebrow">Admin review</span>
          {pending ? <span className="ops-badge ops-b-red" suppressHydrationWarning>Waiting {waitingFor(row.submitted_at, now)}</span> : null}
          <Badge tone={badge === 'Unclaimed' ? 'amber' : badge === 'Assigned to you' ? 'green' : 'mute'}>{badge}</Badge>
          <span className="ml-auto flex items-center gap-1.5">
            {onPrev && <button type="button" onClick={onPrev} aria-label="Previous listing" className="ops-btn !min-h-10 !w-10 !px-0"><ChevronLeft size={18} aria-hidden="true" /></button>}
            {onNext && <button type="button" onClick={onNext} aria-label="Next listing" className="ops-btn !min-h-10 !w-10 !px-0"><ChevronRight size={18} aria-hidden="true" /></button>}
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="ops-btn !min-h-10 !w-10 !px-0"><X size={18} aria-hidden="true" /></button>
          </span>
        </div>

        <div className="ops-scroll flex flex-1 flex-col gap-6 overflow-y-auto p-5 pb-8">
          {photos === null && <div className="aspect-[4/3] w-full ops-skel !rounded-3xl" aria-label="Loading photos" />}
          {photos && photos.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="relative overflow-hidden rounded-3xl bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photos[idx]} alt={`Photo ${idx + 1} of ${photos.length}`} className="aspect-[4/3] w-full object-contain" />
                <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">{idx + 1} / {photos.length}</span>
              </div>
              {photos.length > 1 && (
                <ul className="flex gap-2 overflow-x-auto" aria-label="Photos">
                  {photos.map((u, i) => (
                    <li key={u} className="flex-none">
                      <button type="button" onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === idx} className={`block overflow-hidden rounded-lg border-2 ${i === idx ? 'border-[var(--o-ink)]' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u} alt="" className="h-16 w-16 object-cover" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {photos && photos.length === 0 && <p className="text-[var(--o-red-t)]">Photos could not be loaded.</p>}

          {row.video_url && (videoBad ? (
            <p className="ops-card2 p-3 text-sm ops-mute">Video unavailable</p>
          ) : video ? (
            <video src={video} controls playsInline className="max-h-72 w-full rounded-3xl bg-black" onError={() => setVideoBad(true)} />
          ) : <div className="h-24 w-full ops-skel !rounded-3xl" aria-label="Loading video" />)}

          <div>
            <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight">{row.title}</h2>
            <p className="ops-num mt-3 text-[44px]">{naira(row.price_ngn)}</p>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{row.description}</p>
          <dl className="grid grid-cols-2 gap-2 text-[13px]">
            {facts.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="ops-card2 px-4 py-3"><dt className="ops-eyebrow !text-[10.5px]">{k}</dt><dd className="font-bold">{v}</dd></div>
            ))}
          </dl>
          <div className="ops-card2 p-4 text-sm">
            <p className="ops-eyebrow">Seller</p>
            <p className="mt-1 text-sm font-semibold">{row.seller_name}</p>
            <p>{row.seller_phone}</p>
            {!row.contact_visible && (
              <p className="ops-mute mt-2 flex items-start gap-2"><ShieldAlert size={16} className="mt-0.5 flex-none" aria-hidden="true" />Full details show once you are in charge of this listing.</p>
            )}
          </div>
          {pending && (
            <div>
              <p className="ops-eyebrow mb-2">Before you approve</p>
              <ul className="flex flex-col">
                {['Photos are clear', 'Video plays', 'Price looks fair', 'Item is allowed'].map((c) => (
                  <li key={c}><button type="button" className="ops-check" aria-pressed={checks.includes(c)} onClick={() => toggle(c)}><span><Check size={13} strokeWidth={3} aria-hidden="true" /></span>{c}</button></li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {pending && (
          <div className="grid grid-cols-3 gap-2 border-t border-[var(--o-line)] bg-[var(--o-card)] p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <button type="button" className="ops-btn ops-btn-stop ops-btn-lg" disabled={busy} onClick={onReject}>Reject <span className="ops-kbd hidden md:inline-flex">R</span></button>
            {row.assigned_admin_id === null ? (
              <button type="button" className="ops-btn ops-btn-blue ops-btn-lg" disabled={busy} onClick={onClaim}>Claim <span className="ops-kbd hidden md:inline-flex">C</span></button>
            ) : <button type="button" className="ops-btn ops-btn-lg" onClick={onClose}>Close</button>}
            <button type="button" className="ops-btn ops-btn-go ops-btn-lg" disabled={busy} onClick={onApprove}>Approve <span className="ops-kbd hidden md:inline-flex">A</span></button>
          </div>
        )}
      </div>
    </div>
  );
}
