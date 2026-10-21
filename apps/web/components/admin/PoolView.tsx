'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Download, Search, Share2 } from 'lucide-react';
import { naira, type FeedRow } from '@/lib/admin/inbox';
import { adText, cleanSearch, pageRange, POOL_PAGE_SIZE, validFilters, type PoolFilters } from '@/lib/admin/pool';
import { CATEGORIES, REGIONS } from '@/lib/listing/schema';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { toCsv } from './csv';
import { ageLabel, Badge, BigStat, categoryLabel, Band, Hero, Notice, regionLabelOf, workingLabel } from './ui';

type Sort = 'recent' | 'price_low' | 'price_high';

export function PoolView({ me, first, firstThumbs }: { me: { id: string; isGlobal: boolean; region: string | null }; first: FeedRow[]; firstThumbs: Record<string, string> }) {
  const [rows, setRows] = useState(first);
  const [thumbs, setThumbs] = useState(firstThumbs);
  const [filters, setFilters] = useState<PoolFilters>({ category: null, region: null, search: '' });
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(first.length === POOL_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('recent');
  const [mineOnly, setMineOnly] = useState(false);

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

  const shown = useMemo(() => {
    const out = mineOnly ? rows.filter((r) => r.assigned_admin_id === me.id) : rows;
    const price = (r: FeedRow) => Number(r.price_ngn) || 0;
    if (sort === 'price_low') return [...out].sort((a, b) => price(a) - price(b));
    if (sort === 'price_high') return [...out].sort((a, b) => price(b) - price(a));
    return out;
  }, [rows, sort, mineOnly, me.id]);

  const total = useMemo(() => shown.reduce((n, r) => n + (Number(r.price_ngn) || 0), 0), [shown]);
  const mineCount = useMemo(() => rows.filter((r) => r.assigned_admin_id === me.id).length, [rows, me.id]);
  // Stock value split by region (Global Admin) or by category (Regional Admin), for the bar under the headline.
  const split = useMemo(() => {
    const groups = me.isGlobal ? REGIONS : CATEGORIES;
    const key = (r: FeedRow) => (me.isGlobal ? r.region : r.category);
    const palette = ['#D32F2F', '#16A34A', '#2563EB', '#7A7A74', '#F59E0B', '#92600A'];
    return groups
      .map((g, i) => ({ label: g.label, value: shown.filter((r) => key(r) === g.value).reduce((n, r) => n + (Number(r.price_ngn) || 0), 0), n: shown.filter((r) => key(r) === g.value).length, color: palette[i % palette.length] }))
      .filter((g) => g.n > 0)
      .sort((a, b) => b.value - a.value);
  }, [shown, me.isGlobal]);

  function exportCsv() {
    // Seller columns carry exactly what this screen shows. The database view already masks them for listings you are not in charge of.
    const csv = toCsv(
      ['Title', 'Price (NGN)', 'Category', 'Region', 'Age', 'Working', 'Brand', 'Model', 'Size', 'Approved', 'In charge', 'Seller', 'Seller phone'],
      shown.map((r) => [r.title, Math.round(Number(r.price_ngn) || 0), categoryLabel(r.category), regionLabelOf(r.region), ageLabel(r.condition_age), workingLabel(r.condition_work),
        r.brand, r.model, r.size, r.approved_at ? r.approved_at.slice(0, 10) : '', r.admin_in_charge_name, r.seller_name, r.seller_phone]),
    );
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `obn-pool-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <Hero
        photo="/photos/kitchen.webp" pos="object-center"
        eyebrow={<>Regional pool · {me.isGlobal ? 'all regions' : regionLabelOf(me.region) || 'your region'}</>}
        title={<>{shown.length}{more ? '+' : ''} {shown.length === 1 ? 'item is' : 'items are'} live.</>}
        sub="Approved and ready to advertise. Sales stay with the admin in charge."
        actions={<button type="button" className="ops-btn ops-btn-cta ops-btn-lg" onClick={exportCsv} disabled={shown.length === 0}><Download size={16} aria-hidden="true" />Export CSV</button>}
      >
        <div className="ops-kpis" aria-live="polite">
          <BigStat label="Live items" tone="green" value={`${shown.length}${more ? '+' : ''}`} hint="Approved and advertised" />
          <BigStat label="Stock value" tone="amber" value={naira(total)} hint="Asking prices added up" />
          <BigStat label="In my charge" tone="blue" value={mineCount} hint="Sales stay with me" />
          <BigStat label={me.isGlobal ? 'Regions' : 'Categories'} tone="red" value={split.length} hint={split[0] ? `Top: ${split[0].label}` : 'Nothing yet'} />
        </div>
      </Hero>

      <Band tone="green" label="Pool" className="flex flex-col gap-6">
        {split.length > 0 && (
          <div className="ops-card p-5" aria-label={me.isGlobal ? 'Stock value by region' : 'Stock value by category'}>
            <p className="ops-eyebrow mb-3">Stock value by {me.isGlobal ? 'region' : 'category'}</p>
            <div className="ops-bar !h-3" role="img" aria-label={split.map((g) => `${g.label} ${naira(g.value)}`).join(', ')}>
              {split.map((g) => <i key={g.label} style={{ flexGrow: g.value, background: g.color }} />)}
            </div>
            <ul className="mt-3.5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {split.map((g) => (
                <li key={g.label} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} aria-hidden="true" /><span className="font-bold">{g.label}</span><span className="ops-mute ops-tnum">{naira(g.value)} · {g.n}</span></li>
              ))}
            </ul>
          </div>
        )}

      <section className="flex flex-col gap-3" aria-label="Filters">
        <div className="flex flex-wrap items-center gap-2">
          {me.isGlobal && (
            <div className="ops-seg" role="group" aria-label="Region">
              <button type="button" aria-pressed={!filters.region} onClick={() => apply({ region: null })}>All regions</button>
              {REGIONS.map((r) => <button key={r.value} type="button" aria-pressed={filters.region === r.value} onClick={() => apply({ region: filters.region === r.value ? null : r.value })}>{r.label}</button>)}
            </div>
          )}
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-bold">
            <input type="checkbox" className="ops-checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Only items I am in charge of
          </label>
        </div>
        <div className="ops-seg" role="group" aria-label="Category">
          <button type="button" aria-pressed={!filters.category} onClick={() => apply({ category: null })}>Everything</button>
          {CATEGORIES.map((c) => <button key={c.value} type="button" aria-pressed={filters.category === c.value} onClick={() => apply({ category: filters.category === c.value ? null : c.value })}>{c.label}</button>)}
        </div>
        <form className="grid gap-2 sm:grid-cols-[1fr_200px_auto]" role="search" onSubmit={(e) => { e.preventDefault(); apply({ search: filters.search }); }}>
          <div className="relative">
            <label htmlFor="pool-search" className="sr-only">Search by title</label>
            <Search size={15} className="pointer-events-none absolute left-4 top-[15px] text-[var(--o-mute)]" aria-hidden="true" />
            <input id="pool-search" className="ops-input !pl-11" type="search" placeholder="Search by title" value={filters.search} maxLength={60}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onBlur={() => { if (cleanSearch(filters.search) !== filters.search) apply({ search: filters.search }); }} />
          </div>
          <label className="sr-only" htmlFor="pool-sort">Sort</label>
          <select id="pool-sort" className="ops-input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="recent">Recently approved</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option>
          </select>
          <button type="submit" className="ops-btn ops-btn-cta" disabled={loading}>Search</button>
        </form>
      </section>

      {error && <Notice kind="error">{error}</Notice>}
      {!loading && shown.length === 0 && (
        <div className="ops-card flex flex-col items-center gap-1.5 px-6 py-14 text-center">
          <p className="text-base font-extrabold">{mineOnly ? 'Nothing is in your charge yet.' : 'The pool is empty.'}</p>
          <p className="ops-mute max-w-md">{mineOnly ? 'Claim and approve listings in Review and they show up here.' : 'Approved listings land here, ready to advertise.'}</p>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 min-[1100px]:grid-cols-3 min-[1400px]:grid-cols-4" aria-label="Approved listings">
        {shown.map((r, i) => {
          const mine = r.assigned_admin_id === me.id;
          const src = thumbs[r.photo_urls[0]];
          const share = `https://wa.me/?text=${encodeURIComponent(adText(r))}`;
          const feature = false && i === 0;
          return (
            <li key={r.id} className={`ops-card ops-lift flex flex-col overflow-hidden ${feature ? 'sm:col-span-2 xl:row-span-2' : ''}`}>
              <div className={`ops-photo ${feature ? 'aspect-[4/3]' : 'aspect-[4/3]'}`} style={{ cursor: 'default' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="absolute inset-0 flex items-end p-3 text-[13px] font-medium text-[var(--o-mute)]">No photo</span>}
                {mine && <span className="absolute right-3 top-3 z-[2]"><Badge tone="green">You are in charge</Badge></span>}
                <span className="ops-num absolute bottom-2 left-2 z-[2] rounded-md bg-[var(--o-card)] px-2.5 py-1 text-[13.5px] shadow-sm">{naira(r.price_ngn)}</span>
              </div>
              <div className="flex flex-col gap-3 p-4">
                <div>
                  <p className="truncate text-base font-bold">{r.title}</p>
                  <p className="ops-mute text-[13px]">
                    {categoryLabel(r.category)}{me.isGlobal ? ` · ${regionLabelOf(r.region)}` : ''} · {ageLabel(r.condition_age)} · {workingLabel(r.condition_work)}
                  </p>
                </div>
                <p className="text-[13px] font-medium">{r.seller_name} · {r.seller_phone}</p>
                {!r.contact_visible && r.admin_in_charge_name && (
                  <p className="ops-mute text-[13px]">In charge: {r.admin_in_charge_name}. Coordinate with them in the group chat.</p>
                )}
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button type="button" className="ops-btn ops-btn-sm" onClick={() => copyAd(r)}>
                    {copied === r.id ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{copied === r.id ? 'Copied' : 'Copy ad'}
                  </button>
                  <a className="ops-btn ops-btn-go ops-btn-sm" href={share} target="_blank" rel="noopener noreferrer"><Share2 size={14} aria-hidden="true" />WhatsApp</a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {more && rows.length > 0 && (
        <button type="button" className="ops-btn mx-auto min-w-48" disabled={loading} onClick={() => load(filters, page + 1, false)}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
      </Band>
    </>
  );
}
