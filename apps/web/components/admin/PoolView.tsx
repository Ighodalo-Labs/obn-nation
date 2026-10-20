'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { naira, type FeedRow } from '@/lib/admin/inbox';
import { adText, cleanSearch, pageRange, POOL_PAGE_SIZE, validFilters, type PoolFilters } from '@/lib/admin/pool';
import { AGES, CATEGORIES, REGIONS, WORKING } from '@/lib/listing/schema';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { inputClass, secondaryButton } from '../listing/ui';

const label = (list: readonly { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;
const chip = 'rounded-full border border-border px-2 py-1 text-xs text-muted';

export function PoolView({ me, first, firstThumbs }: { me: { id: string; isGlobal: boolean; region: string | null }; first: FeedRow[]; firstThumbs: Record<string, string> }) {
  const [rows, setRows] = useState(first);
  const [thumbs, setThumbs] = useState(firstThumbs);
  const [filters, setFilters] = useState<PoolFilters>({ category: null, region: null, search: '' });
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(first.length === POOL_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load(f: PoolFilters, pageNo: number, replace: boolean) {
    setLoading(true);
    setError(null);
    try {
      const db = createBrowserSupabase();
      const [from, to] = pageRange(pageNo);
      let q = db.from('regional_listings_feed').select('*').eq('status', 'approved');
      if (f.category) q = q.eq('category', f.category);
      if (f.region) q = q.eq('region', f.region);
      if (f.search) q = q.ilike('title', `%${f.search}%`);
      const { data, error: err } = await q.order('approved_at', { ascending: false }).range(from, to);
      if (err) throw err;
      const got = (data ?? []) as FeedRow[];
      const firsts = got.map((r) => r.photo_urls[0]).filter(Boolean);
      const next: Record<string, string> = {};
      if (firsts.length) {
        const { data: signed } = await db.storage.from('photos').createSignedUrls(firsts, 3600);
        for (const s of signed ?? []) if (s.path && s.signedUrl) next[s.path] = s.signedUrl;
      }
      setThumbs((t) => ({ ...(replace ? {} : t), ...next }));
      setRows((r) => (replace ? got : [...r, ...got]));
      setPage(pageNo);
      setMore(got.length === POOL_PAGE_SIZE);
    } catch {
      setError('We could not load the list. Check your network and try again.');
    } finally {
      setLoading(false);
    }
  }

  function apply(patch: Partial<PoolFilters>) {
    const f = validFilters({ ...filters, ...patch });
    setFilters(f);
    void load(f, 0, true);
  }

  async function copyAd(r: FeedRow) {
    try { await navigator.clipboard.writeText(adText(r)); setCopied(r.id); setTimeout(() => setCopied(null), 2000); } catch { setError('Copy did not work on this phone.'); }
  }

  return (
    <div className="flex flex-col gap-4 py-4 pb-10">
      <h1 className="text-2xl">Pool</h1>
      <p className="text-sm text-muted">Approved items {me.isGlobal ? 'in all regions' : me.region ? `in ${label(REGIONS, me.region)}` : ''}. Sales stay with the admin in charge.</p>

      <div className="flex flex-col gap-2">
        <label htmlFor="pool-search" className="sr-only">Search by title</label>
        <input id="pool-search" className={inputClass} type="search" placeholder="Search by title" value={filters.search} maxLength={60}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') apply({ search: cleanSearch(filters.search) }); }}
          onBlur={() => { if (cleanSearch(filters.search) !== filters.search) apply({ search: filters.search }); }} />
        <div className={`grid gap-2 ${me.isGlobal ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <label className="sr-only" htmlFor="pool-cat">Category</label>
          <select id="pool-cat" className={inputClass} value={filters.category ?? ''} onChange={(e) => apply({ category: e.target.value || null })}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {me.isGlobal && (
            <>
              <label className="sr-only" htmlFor="pool-region">Region</label>
              <select id="pool-region" className={inputClass} value={filters.region ?? ''} onChange={(e) => apply({ region: e.target.value || null })}>
                <option value="">All regions</option>
                {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </>
          )}
        </div>
        <button type="button" className={secondaryButton} onClick={() => apply({ search: filters.search })} disabled={loading}>Search</button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-tint-red bg-surface p-3 text-tint-red">{error}</p>}
      {!loading && rows.length === 0 && <p className="py-8 text-center text-muted">No approved listings yet.</p>}

      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const mine = r.assigned_admin_id === me.id;
          const thumb = thumbs[r.photo_urls[0]];
          return (
            <li key={r.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
              <div className="flex gap-3">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="h-20 w-20 flex-none rounded object-cover" />
                ) : <div className="h-20 w-20 flex-none rounded bg-border" aria-hidden="true" />}
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-base font-semibold">{r.title}</p>
                  <p className="text-base">{naira(r.price_ngn)}</p>
                  <p className="flex flex-wrap gap-1">
                    <span className={chip}>{label(CATEGORIES, r.category)}</span>
                    {me.isGlobal && <span className={chip}>{label(REGIONS, r.region)}</span>}
                    <span className={chip}>{label(AGES, r.condition_age)}</span>
                    <span className={chip}>{label(WORKING, r.condition_work)}</span>
                  </p>
                </div>
              </div>
              <p className="text-sm">
                {mine && <span className="mr-2 rounded bg-brand-green px-2 py-1 text-xs font-semibold text-white">You are in charge</span>}
                <span className="text-muted">{r.seller_name} · {r.seller_phone}</span>
              </p>
              {!r.contact_visible && r.admin_in_charge_name && (
                <p className="text-sm text-muted">In charge: {r.admin_in_charge_name}. Coordinate with them in the group chat.</p>
              )}
              <button type="button" className={secondaryButton} onClick={() => copyAd(r)}>
                <Copy size={18} className="mr-2 inline" aria-hidden="true" />{copied === r.id ? 'Copied' : 'Copy ad text'}
              </button>
            </li>
          );
        })}
      </ul>

      {more && rows.length > 0 && (
        <button type="button" className={secondaryButton} disabled={loading} onClick={() => load(filters, page + 1, false)}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
