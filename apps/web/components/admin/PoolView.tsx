'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Download, Package, Search, Share2 } from 'lucide-react';
import { naira, type FeedRow } from '@/lib/admin/inbox';
import { adText, cleanSearch, pageRange, POOL_PAGE_SIZE, validFilters, type PoolFilters } from '@/lib/admin/pool';
import { CATEGORIES, REGIONS } from '@/lib/listing/schema';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { toCsv } from './csv';
import { ageLabel, Banner, Card, categoryLabel, EmptyState, Metrics, Page, regionLabelOf, Thumb, workingLabel } from './ui';

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
    const palette = ['#D32F2F', '#2E7D32', '#1565C0', '#E8A200', '#8C8574', '#16140F'];
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

  function RowActions({ r, wide = false }: { r: FeedRow; wide?: boolean }) {
    const share = `https://wa.me/?text=${encodeURIComponent(adText(r))}`;
    return (
      <div className="flex gap-2">
        <button type="button" className={`ops-btn ops-btn-sm ${wide ? 'flex-1' : ''}`} onClick={() => copyAd(r)}>
          {copied === r.id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}{copied === r.id ? 'Copied' : 'Copy ad'}
        </button>
        <a className={`ops-btn ops-btn-sm ${wide ? 'flex-1' : ''}`} href={share} target="_blank" rel="noopener noreferrer"><Share2 size={13} aria-hidden="true" />WhatsApp</a>
      </div>
    );
  }
  const inCharge = (r: FeedRow) => (r.assigned_admin_id === me.id ? 'You' : r.admin_in_charge_name || 'Nobody yet');

  return (
    <Page
      photo="/photos/kitchen.webp"
      title="Pool"
      sub={<>Approved and ready to advertise · {me.isGlobal ? 'All regions' : regionLabelOf(me.region) || 'Your region'}. Sales stay with the admin in charge.</>}
      actions={<button type="button" className="ops-btn" onClick={exportCsv} disabled={shown.length === 0}><Download size={14} aria-hidden="true" />Export CSV</button>}
    >
      <Metrics items={[
        { label: 'Live items', value: `${shown.length}${more ? '+' : ''}`, tone: 'ok', hint: 'Approved and advertised' },
        { label: 'Stock value', value: naira(total), hint: 'Asking prices added up' },
        { label: 'In my charge', value: mineCount, tone: 'info', hint: 'Sales stay with me' },
        { label: me.isGlobal ? 'Regions' : 'Categories', value: split.length, hint: split[0] ? `Top: ${split[0].label}` : 'Nothing yet' },
      ]} />

      {split.length > 0 && (
        <Card title={`Stock value by ${me.isGlobal ? 'region' : 'category'}`} label={me.isGlobal ? 'Stock value by region' : 'Stock value by category'}>
          <div className="ops-bar" role="img" aria-label={split.map((g) => `${g.label} ${naira(g.value)}`).join(', ')}>
            {split.map((g) => <i key={g.label} style={{ flexGrow: g.value, background: g.color }} />)}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
            {split.map((g) => (
              <li key={g.label} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: g.color }} aria-hidden="true" /><span className="font-medium">{g.label}</span><span className="ops-mute ops-tnum">{naira(g.value)} · {g.n}</span></li>
            ))}
          </ul>
        </Card>
      )}

      {error && <Banner tone="crit" onDismiss={() => setError(null)}>{error}</Banner>}

      <Card pad={false} label="Approved listings">
        <form className="ops-filters !border-b !border-[var(--p-border2)]" role="search" aria-label="Filters" onSubmit={(e) => { e.preventDefault(); apply({ search: filters.search }); }}>
          <div className="ops-search">
            <label htmlFor="pool-search" className="sr-only">Search by title</label>
            <Search size={15} aria-hidden="true" />
            <input id="pool-search" className="ops-input" type="search" placeholder="Search by title" value={filters.search} maxLength={60}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onBlur={() => { if (cleanSearch(filters.search) !== filters.search) apply({ search: filters.search }); }} />
          </div>
          {me.isGlobal && (
            <label className="ops-filterbtn" data-on={Boolean(filters.region)}>
              <span>{filters.region ? `Region: ${regionLabelOf(filters.region)}` : 'Region'}</span>
              <select aria-label="Region" value={filters.region ?? ''} onChange={(e) => apply({ region: e.target.value || null })}>
                <option value="">All regions</option>{REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
          )}
          <label className="ops-filterbtn" data-on={Boolean(filters.category)}>
            <span>{filters.category ? `Category: ${categoryLabel(filters.category)}` : 'Category'}</span>
            <select aria-label="Category" value={filters.category ?? ''} onChange={(e) => apply({ category: e.target.value || null })}>
              <option value="">All categories</option>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
          <label className="ops-filterbtn" data-on="true">
            <span>Sort: {sort === 'recent' ? 'Recently approved' : sort === 'price_low' ? 'Price: low to high' : 'Price: high to low'}</span>
            <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="recent">Recently approved</option><option value="price_low">Price: low to high</option><option value="price_high">Price: high to low</option>
            </select>
          </label>
          <label className="flex min-h-8 cursor-pointer items-center gap-2 text-[13px]">
            <input type="checkbox" className="ops-checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            Only items I am in charge of
          </label>
          <button type="submit" className="ops-btn ops-btn-sm" disabled={loading}>Search</button>
        </form>

        {!loading && shown.length === 0 && (
          <EmptyState photo="/photos/kitchen.webp" icon={<Package size={22} />} title={mineOnly ? 'Nothing is in your charge yet' : 'The pool is empty'}>
            {mineOnly ? 'Claim and approve listings in Review and they show up here.' : 'Approved listings land here, ready to advertise.'}
          </EmptyState>
        )}

        {shown.length > 0 && (
          <div className="ops-tablewrap hidden xl:block">
            <table className="ops-table" aria-label="Approved listings">
              <thead>
                <tr><th scope="col" className="!w-auto !pl-4">Listing</th><th scope="col" className="ops-r">Price</th><th scope="col">Category</th>{me.isGlobal && <th scope="col">Region</th>}<th scope="col">Seller</th><th scope="col">In charge</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} style={{ cursor: 'default' }}>
                    <td className="max-w-[300px] !w-auto !pl-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Thumb src={thumbs[r.photo_urls[0]]} large />
                        <span className="min-w-0"><span className="block truncate font-semibold">{r.title}</span><span className="ops-mute block truncate text-xs">{ageLabel(r.condition_age)} · {workingLabel(r.condition_work)}</span></span>
                      </div>
                    </td>
                    <td className="ops-num">{naira(r.price_ngn)}</td>
                    <td className="whitespace-nowrap">{categoryLabel(r.category)}</td>
                    {me.isGlobal && <td className="whitespace-nowrap">{regionLabelOf(r.region)}</td>}
                    <td className="max-w-[170px]"><span className="block truncate">{r.seller_name}</span><span className="ops-mute block truncate text-xs">{r.seller_phone}</span></td>
                    <td className="whitespace-nowrap">{inCharge(r)}</td>
                    <td><RowActions r={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ul className="xl:hidden" aria-label="Approved listings">
          {shown.map((r) => (
            <li key={r.id} className="ops-rowitem">
              <div className="flex gap-3">
                <Thumb src={thumbs[r.photo_urls[0]]} large />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-start justify-between gap-2"><p className="truncate text-[13px] font-semibold">{r.title}</p><p className="ops-tnum flex-none text-[13px] font-semibold">{naira(r.price_ngn)}</p></div>
                  <p className="ops-mute truncate text-xs">{categoryLabel(r.category)}{me.isGlobal ? ` · ${regionLabelOf(r.region)}` : ''} · {ageLabel(r.condition_age)} · {workingLabel(r.condition_work)}</p>
                  <p className="truncate text-xs">{r.seller_name} <span className="ops-mute">· {r.seller_phone}</span></p>
                  {!r.contact_visible && r.admin_in_charge_name && <p className="ops-mute truncate text-xs">In charge: {r.admin_in_charge_name}</p>}
                </div>
              </div>
              <RowActions r={r} wide />
            </li>
          ))}
        </ul>

        <div className="ops-tablefoot">
          <span className="ops-tnum" aria-live="polite">{shown.length}{more ? '+' : ''} {shown.length === 1 ? 'listing' : 'listings'}</span>
          {more && rows.length > 0 && <button type="button" className="ops-btn ops-btn-sm" disabled={loading} onClick={() => load(filters, page + 1, false)}>{loading ? 'Loading…' : 'Load more'}</button>}
        </div>
      </Card>
    </Page>
  );
}
