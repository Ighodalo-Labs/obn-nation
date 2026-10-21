'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ClipboardCheck, Globe2, Home, LogOut, Package, Store } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { regionLabelOf } from './ui';

type Current = 'review' | 'pool' | 'global';
export interface ShellMe { name: string | null; role: 'regional_admin' | 'global_admin'; region: string | null }

const TITLES: Record<Current, string> = { review: 'Review queue', pool: 'Regional pool', global: 'Global console' };

/** Frame for every admin screen: left sidebar and top bar on desktop, bottom tabs on phones. */
export function AdminShell({ current, me, reviewCount, children }: { current: Current; me: ShellMe; reviewCount?: number; children: ReactNode }) {
  const isGlobal = me.role === 'global_admin';
  const [leaving, setLeaving] = useState(false);
  const items = [
    { id: 'review' as const, href: '/admin/dashboard', label: 'Review', Icon: ClipboardCheck },
    { id: 'pool' as const, href: '/admin/pool', label: 'Pool', Icon: Package },
    ...(isGlobal ? [{ id: 'global' as const, href: '/admin/global', label: 'Global', Icon: Globe2 }] : []),
  ];
  const scope = isGlobal ? 'All regions' : regionLabelOf(me.region) || 'No region';
  const initials = (me.name ?? 'A').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  async function signOut() {
    setLeaving(true);
    try { await createBrowserSupabase().auth.signOut(); } finally { window.location.href = '/list'; }
  }

  return (
    <div className="ops-root">
      <div className="flex h-1" aria-hidden="true"><span className="flex-1 bg-brand-red" /><span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-blue" /></div>
      <aside className="ops-side fixed bottom-0 left-0 top-1 z-30 hidden w-64 flex-col gap-6 p-4 md:flex" aria-label="Admin sidebar">
        <Link href="/" className="flex min-h-14 items-center gap-3 rounded-xl px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label="OBN NATION home">
          <Image src="/brand/obn-logo-clear.webp" alt="" width={44} height={44} priority className="h-11 w-11" />
          <span className="flex flex-col leading-tight"><span className="font-display text-base font-extrabold tracking-wide">OBN NATION</span><span className="ops-mute text-xs">Admin console</span></span>
        </Link>
        <nav aria-label="Admin" className="flex flex-col gap-1">
          {items.map(({ id, href, label, Icon }) => (
            <Link key={id} href={href} className="ops-nav" aria-current={current === id ? 'page' : undefined}>
              <Icon size={20} aria-hidden="true" />{label}
              {id === 'review' && typeof reviewCount === 'number' && reviewCount > 0 && <span className="ops-badge ops-b-red ml-auto">{reviewCount}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1">
          <div className="ops-card2 mb-2 flex items-center gap-3 p-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brand-blue text-sm font-extrabold" aria-hidden="true">{initials}</span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">{me.name || 'Admin'}</span>
              <span className="ops-mute block text-xs">{isGlobal ? 'Global Admin' : 'Regional Admin'} · {scope}</span>
            </span>
          </div>
          <Link href="/list" className="ops-nav"><Store size={20} aria-hidden="true" />Seller view</Link>
          <Link href="/" className="ops-nav"><Home size={20} aria-hidden="true" />Home page</Link>
          <button type="button" className="ops-nav w-full" onClick={signOut} disabled={leaving}><LogOut size={20} aria-hidden="true" />{leaving ? 'Signing out…' : 'Sign out'}</button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="ops-top sticky top-0 z-20 flex min-h-14 items-center gap-3 px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2 md:hidden" aria-label="OBN NATION home">
            <Image src="/brand/obn-logo-clear.webp" alt="" width={36} height={36} className="h-9 w-9" />
          </Link>
          <p className="font-display whitespace-nowrap text-base font-extrabold tracking-tight">{TITLES[current]}</p>
          <span className="ops-chip ml-auto hidden sm:inline-flex">{scope}</span>
          <span className="ml-auto sm:hidden" />
          <span className="ops-badge ops-b-blue hidden sm:inline-flex">{isGlobal ? 'Global' : 'Regional'}</span>
          <button type="button" className="ops-btn !min-h-10 !px-3 md:hidden" onClick={signOut} disabled={leaving} aria-label="Sign out"><LogOut size={18} aria-hidden="true" /></button>
        </header>
        <main className="mx-auto w-full max-w-[1320px] px-4 pb-28 pt-6 md:px-8 md:pb-14">{children}</main>
      </div>

      <nav aria-label="Admin tabs" className="ops-side fixed inset-x-0 bottom-0 z-30 flex border-r-0 border-t border-[#232C3D] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {items.map(({ id, href, label, Icon }) => (
          <Link key={id} href={href} className="ops-tab" aria-current={current === id ? 'page' : undefined}>
            <Icon size={22} aria-hidden="true" />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
