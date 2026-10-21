'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Download, PackageOpen, Search, Share2 } from 'lucide-react';
import { naira, type FeedRow } from '@/lib/admin/inbox';
import { adText, cleanSearch, pageRange, POOL_PAGE_SIZE, validFilters, type PoolFilters } from '@/lib/admin/pool';
import { CATEGORIES, REGIONS } from '@/lib/listing/schema';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { toCsv } from './csv';
import { ageLabel, Badge, categoryLabel, Notice, PageTitle, regionLabelOf, StatCard, Thumb, workingLabel } from './ui';

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
  const byCat = useMemo(() => CATEGORIES.map((c) => ({ ...c, n: shown.filter((r) => r.category === c.value).length })).filter((c) => c.n > 0), [shown]);

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
    <div className="flex flex-col gap-6">
      <PageTitle title="Regional pool" sub={`Approved items ${me.isGlobal ? 'in all regions' : me.region ? `in ${regionLabelOf(me.region)}` : ''}. Sales stay with the admin in charge.`}>
        <button type="button" className="ops-btn" onClick={exportCsv} disabled={shown.length === 0}><Download size={18} aria-hidden="true" />Export CSV</button>
      </PageTitle>

      <section aria-label="Pool at a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="In the pool" value={shown.length} tone="green" hint={more ? 'More to load' : 'All loaded'} />
        <StatCard label="Total value" value={naira(total)} tone="blue" hint="Of what you see below" />
        <StatCard label="You are in charge of" value={mineCount} tone="red" />
        <StatCard label="Categories" value={byCat.length} tone="amber" hint={byCat.slice(0, 3).map((c) => `${c.label} ${c.n}`).join(' · ') || 'None yet'} />
      </section>

      <form className="grid gap-2 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto]" role="search" onSubmit={(e) => { e.preventDefault(); apply({ search: filters.search }); }}>
        <div className="relative">
          <label htmlFor="pool-search" className="sr-only">Search by title</label>
          <Search size={18} className="ops-mute pointer-events-none absolute left-3 top-3" aria-hidden="true" />
          <input id="pool-search" className="ops-input !pl-10" type="search" placeholder="Search by title" value={filters.search} maxLength={60}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            onBlur={() => { if (cleanSearch(filters.search) !== filters.search) apply({ search: filters.search }); }} />
        </div>
        <label className="sr-only" htmlFor="pool-cat">Category</label>
        <select id="pool-cat" className="ops-input" value={filters.category ?? ''} onChange={(e) => apply({ category: e.target.value || null })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {me.isGlobal ? (
          <>
            <label className="sr-only" htmlFor="pool-region">Region</label>
            <select id="pool-region" className="ops-input" value={filters.region ?? ''} onChange={(e) => apply({ region: e.target.value || null })}>
              <option value="">All regions</option>
              {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </>
        ) : <span className="hidden md:block" />}
        <label className="sr-only" htmlFor="pool-sort">Sort</label>
        <select id="pool-sort" className="ops-input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="recent">Recently approved</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option>
        </select>
        <button type="submit" className="ops-btn ops-btn-red" disabled={loading}>Search</button>
      </form>
      <label className="ops-mute flex min-h-11 w-fit cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-[#D32F2F]" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
        Only items I am in charge of
      </label>

      {error && <Notice kind="error">{error}</Notice>}
      {!loading && shown.length === 0 && (
        <div className="ops-card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1F293C]" aria-hidden="true"><PackageOpen size={26} /></span>
          <p className="font-display text-xl font-extrabold">{mineOnly ? 'Nothing is in your charge yet.' : 'The pool is empty.'}</p>
          <p className="ops-mute max-w-sm text-sm">{mineOnly ? 'Claim and approve listings in Review and they show up here.' : 'Approved listings land here, ready to advertise.'}</p>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Approved listings">
        {shown.map((r) => {
          const mine = r.assigned_admin_id === me.id;
          const thumb = thumbs[r.photo_urls[0]];
          const share = `https://wa.me/?text=${encodeURIComponent(adText(r))}`;
          return (
            <li key={r.id} className="ops-card flex flex-col overflow-hidden">
              <div className="relative aspect-[4/3] bg-[#0E1219]">
                <Thumb src={thumb} size="h-full w-full !rounded-none" />
                {mine && <span className="absolute left-3 top-3"><Badge tone="green">You are in charge</Badge></span>}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="font-display truncate text-lg font-extrabold tracking-tight">{r.title}</p>
                  <p className="font-display text-lg font-bold text-[#66BB6A]">{naira(r.price_ngn)}</p>
                </div>
                <p className="flex flex-wrap gap-1.5">
                  <span className="ops-chip">{categoryLabel(r.category)}</span>
                  {me.isGlobal && <span className="ops-chip">{regionLabelOf(r.region)}</span>}
                  <span className="ops-chip">{ageLabel(r.condition_age)}</span>
                  <span className="ops-chip">{workingLabel(r.condition_work)}</span>
                </p>
                <p className="ops-mute text-sm">{r.seller_name} · {r.seller_phone}</p>
                {!r.contact_visible && r.admin_in_charge_name && (
                  <p className="ops-mute text-sm">In charge: {r.admin_in_charge_name}. Coordinate with them in the group chat.</p>
                )}
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button type="button" className="ops-btn" onClick={() => copyAd(r)}>
                    {copied === r.id ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}{copied === r.id ? 'Copied' : 'Copy ad text'}
                  </button>
                  <a className="ops-btn ops-btn-go" href={share} target="_blank" rel="noopener noreferrer"><Share2 size={18} aria-hidden="true" />WhatsApp</a>
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
    </div>
  );
}
