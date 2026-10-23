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
    <div className="ops-scrim flex justify-end" style={{ zIndex: 50 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" data-drawer aria-label={row.title} className="ops-sheet flex h-full w-full max-w-[720px] flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--p-border)] bg-[var(--p-surface)] px-3 py-2.5 sm:px-4">
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="ops-btn ops-btn-icon"><X size={16} aria-hidden="true" /></button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{row.title}</h2>
            <p className="ops-mute truncate text-xs">{naira(row.price_ngn)} · {regionLabelOf(row.region)}</p>
          </div>
          {pending ? <Badge tone="red"><span suppressHydrationWarning>Waiting {waitingFor(row.submitted_at, now)}</span></Badge>
            : row.status === 'approved' ? <Badge tone="green">Live</Badge> : <Badge tone="blue">With seller</Badge>}
          <Badge tone={badge === 'Unclaimed' ? 'amber' : badge === 'Assigned to you' ? 'green' : 'mute'} plain>{badge}</Badge>
          <span className="flex items-center gap-1">
            {onPrev && <button type="button" onClick={onPrev} aria-label="Previous listing" className="ops-btn ops-btn-icon"><ChevronLeft size={16} aria-hidden="true" /></button>}
            {onNext && <button type="button" onClick={onNext} aria-label="Next listing" className="ops-btn ops-btn-icon"><ChevronRight size={16} aria-hidden="true" /></button>}
          </span>
        </div>

        <div className="ops-scroll flex flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
          <section className="ops-card">
            <div className="ops-card-h"><h3 className="ops-card-t">Media</h3></div>
            <div className="ops-card-b flex flex-col gap-3">
              {photos === null && <div className="ops-skel aspect-[4/3] w-full" aria-label="Loading photos" />}
              {photos && photos.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="relative overflow-hidden rounded-lg bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photos[idx]} alt={`Photo ${idx + 1} of ${photos.length}`} className="aspect-[4/3] w-full object-contain sm:aspect-[3/2]" />
                    <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">{idx + 1} / {photos.length}</span>
                  </div>
                  {photos.length > 1 && (
                    <ul className="flex gap-2 overflow-x-auto" aria-label="Photos">
                      {photos.map((u, i) => (
                        <li key={u} className="flex-none">
                          <button type="button" onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === idx} className={`block overflow-hidden rounded-lg ${i === idx ? 'ring-2 ring-[var(--p-focus)]' : 'opacity-70 hover:opacity-100'}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u} alt="" className="h-14 w-14 object-cover" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {photos && photos.length === 0 && <p className="text-[13px] text-[var(--p-crit-text)]">Photos could not be loaded.</p>}
              {row.video_url && (videoBad ? (
                <p className="ops-mute rounded-lg bg-[var(--p-surface2)] p-3 text-[13px]">Video unavailable</p>
              ) : video ? (
                <video src={video} controls playsInline className="max-h-72 w-full rounded-lg bg-black" onError={() => setVideoBad(true)} />
              ) : <div className="ops-skel h-24 w-full" aria-label="Loading video" />)}
            </div>
          </section>

          <section className="ops-card">
            <div className="ops-card-h"><h3 className="ops-card-t">Details</h3></div>
            <div className="ops-card-b">
              <p className="text-2xl font-semibold">{naira(row.price_ngn)}</p>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-5">{row.description}</p>
              <dl className="ops-dl mt-3">
                {facts.filter(([, v]) => v).map(([k, v]) => (<div key={k} className="contents"><dt>{k}</dt><dd>{v}</dd></div>))}
              </dl>
            </div>
          </section>

          <section className="ops-card">
            <div className="ops-card-h"><h3 className="ops-card-t">Seller</h3></div>
            <div className="ops-card-b text-[13px]">
              <p className="font-semibold">{row.seller_name}</p>
              <p className="ops-tnum">{row.seller_phone}</p>
              {!row.contact_visible && (
                <p className="ops-mute mt-2 flex items-start gap-2"><ShieldAlert size={14} className="mt-0.5 flex-none" aria-hidden="true" />Full details show once you are in charge of this listing.</p>
              )}
            </div>
          </section>

          {pending && (
            <section className="ops-card">
              <div className="ops-card-h"><h3 className="ops-card-t">Before you approve</h3></div>
              <div className="ops-card-b !pt-2">
                <ul className="flex flex-col">
                  {['Photos are clear', 'Video plays', 'Price looks fair', 'Item is allowed'].map((c) => (
                    <li key={c}><button type="button" className="ops-check" aria-pressed={checks.includes(c)} onClick={() => toggle(c)}><span><Check size={11} strokeWidth={3} aria-hidden="true" /></span>{c}</button></li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>

        {pending && (
          <div className="ops-actionbar" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <button type="button" className="ops-btn ops-btn-stop ops-btn-lg" disabled={busy} onClick={onReject}>Reject <kbd className="ops-kbd hidden md:inline-flex">R</kbd></button>
            {row.assigned_admin_id === null ? (
              <button type="button" className="ops-btn ops-btn-lg" disabled={busy} onClick={onClaim}>Claim <kbd className="ops-kbd hidden md:inline-flex">C</kbd></button>
            ) : <button type="button" className="ops-btn ops-btn-lg" onClick={onClose}>Close</button>}
            <button type="button" className="ops-btn ops-btn-primary ops-btn-lg" disabled={busy} onClick={onApprove}>Approve <kbd className="ops-kbd hidden md:inline-flex">A</kbd></button>
          </div>
        )}
      </div>
    </div>
  );
}
