'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { badgeOf, naira, type FeedRow } from '@/lib/admin/inbox';
import { AGES, CATEGORIES, REGIONS, WORKING } from '@/lib/listing/schema';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { primaryButton, secondaryButton } from '../listing/ui';

const label = (list: readonly { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;

/** Full listing view (PRD AD-3): swipe gallery, video, all fields, actions. */
export function ListingDetail({ row, me, busy, onClose, onClaim, onApprove, onReject }: {
  row: FeedRow; me: string; busy: boolean; onClose: () => void; onClaim: () => void; onApprove: () => void; onReject: () => void;
}) {
  const [photos, setPhotos] = useState<string[] | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [videoBad, setVideoBad] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
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
    ['Category', label(CATEGORIES, row.category)], ['Region', label(REGIONS, row.region)], ['Age', label(AGES, row.condition_age)],
    ['Working', label(WORKING, row.condition_work)], ['Brand', row.brand], ['Model', row.model], ['Size', row.size],
  ];
  const pending = row.status === 'pending_review';

  return (
    <div role="dialog" aria-modal="true" aria-label={row.title} className="fixed inset-0 z-50 overflow-y-auto bg-bg">
      <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 pb-28">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{badgeOf(row, me)}</p>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="flex h-12 w-12 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {photos === null && <p className="text-muted">Loading photos…</p>}
        {photos && photos.length > 0 && (
          <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto" aria-label="Photos">
            {photos.map((u, i) => (
              <li key={u} className="w-4/5 flex-none snap-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Photo ${i + 1} of ${photos.length}`} className="aspect-square w-full rounded-lg object-cover" />
              </li>
            ))}
          </ul>
        )}
        {photos && photos.length === 0 && <p className="text-tint-red">Photos could not be loaded.</p>}

        {row.video_url && (videoBad ? (
          <p className="rounded-lg border border-border bg-surface p-3 text-muted">Video unavailable</p>
        ) : video ? (
          <video src={video} controls playsInline className="max-h-72 w-full rounded-lg" onError={() => setVideoBad(true)} />
        ) : <p className="text-muted">Loading video…</p>)}

        <div>
          <h2 className="text-xl">{row.title}</h2>
          <p className="text-lg">{naira(row.price_ngn)}</p>
        </div>
        <p className="whitespace-pre-wrap text-base">{row.description}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {facts.filter(([, v]) => v).map(([k, v]) => (<div key={k}><dt className="text-muted">{k}</dt><dd>{v}</dd></div>))}
        </dl>
        <div className="rounded-lg border border-border bg-surface p-3 text-sm">
          <p className="text-muted">Seller</p>
          <p className="text-base">{row.seller_name}</p>
          <p>{row.seller_phone}</p>
          {!row.contact_visible && <p className="mt-1 text-muted">Full details show once you are in charge of this listing.</p>}
        </div>
      </div>

      {pending && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg p-4">
          <div className="mx-auto grid max-w-xl grid-cols-3 gap-2">
            <button type="button" className={secondaryButton} disabled={busy} onClick={onReject}>Reject</button>
            {row.assigned_admin_id === null ? (
              <button type="button" className={secondaryButton} disabled={busy} onClick={onClaim}>Claim</button>
            ) : <button type="button" className={secondaryButton} onClick={onClose}>Close</button>}
            <button type="button" className={primaryButton} disabled={busy} onClick={onApprove}>Approve</button>
          </div>
        </div>
      )}
    </div>
  );
}
