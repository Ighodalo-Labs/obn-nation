'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronsUpDown, ClipboardCheck, Globe2, Home, LogOut, Package, Store } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { regionLabelOf } from './ui';

type Current = 'review' | 'pool' | 'global';
export interface ShellMe { name: string | null; role: 'regional_admin' | 'global_admin'; region: string | null }

/** Frame for every admin screen: a slim top bar on desktop, a bottom bar on phones. */
export function AdminShell({ current, me, reviewCount, children }: { current: Current; me: ShellMe; reviewCount?: number; children: ReactNode }) {
  const isGlobal = me.role === 'global_admin';
  const [leaving, setLeaving] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const items = [
    { id: 'review' as const, href: '/admin/dashboard', label: 'Review', Icon: ClipboardCheck },
    { id: 'pool' as const, href: '/admin/pool', label: 'Pool', Icon: Package },
    ...(isGlobal ? [{ id: 'global' as const, href: '/admin/global', label: 'Global', Icon: Globe2 }] : []),
  ];
  const scope = isGlobal ? 'All regions' : regionLabelOf(me.region) || 'No region';
  const initials = (me.name ?? 'A').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menu]);

  async function signOut() {
    setLeaving(true);
    try { await createBrowserSupabase().auth.signOut(); } finally { window.location.href = '/list'; }
  }

  const accountMenu = (up: boolean) => menu && (
    <div role="menu" className={`ops-menu ${up ? 'bottom-[calc(100%+6px)] left-0' : 'right-0 top-[calc(100%+6px)]'}`}>
      <div className="px-2.5 pb-2 pt-2">
        <p className="truncate text-sm font-semibold">{me.name || 'Admin'}</p>
        <p className="ops-mute text-xs">{isGlobal ? 'Global Admin' : 'Regional Admin'} · {scope}</p>
      </div>
      <hr className="ops-rule mb-1" />
      <Link role="menuitem" href="/list" className="ops-menuitem"><Store size={16} aria-hidden="true" />Seller view</Link>
      <Link role="menuitem" href="/" className="ops-menuitem"><Home size={16} aria-hidden="true" />Home page</Link>
      <button role="menuitem" type="button" className="ops-menuitem" onClick={signOut} disabled={leaving}><LogOut size={16} aria-hidden="true" />{leaving ? 'Signing out…' : 'Sign out'}</button>
    </div>
  );

  return (
    <div className="ops-root">
      <aside className="ops-side" aria-label="Sidebar">
        <Link href="/" className="flex h-14 items-center gap-2.5 border-b border-[var(--o-line)] px-4" aria-label="OBN NATION home">
          <Image src="/brand/obn-logo-clear.webp" alt="" width={28} height={28} priority className="h-7 w-7" />
          <span className="font-display text-[13.5px] font-semibold tracking-tight">OBN NATION</span>
          <span className="ops-chip ml-auto !text-[11px]">Admin</span>
        </Link>
        <nav aria-label="Admin" className="flex flex-1 flex-col gap-0.5 p-2.5">
          <p className="ops-eyebrow px-2.5 pb-1.5 pt-3">Workspace</p>
          {items.map(({ id, href, label, Icon }) => (
            <Link key={id} href={href} className="ops-navlink" aria-current={current === id ? 'page' : undefined}>
              <Icon size={16} aria-hidden="true" />{label}
              {id === 'review' && typeof reviewCount === 'number' && reviewCount > 0 && <span className="ml-auto rounded-md bg-brand-red px-1.5 text-[11px] font-bold leading-5 text-white tabular-nums">{reviewCount}</span>}
            </Link>
          ))}
        </nav>
        <div ref={menuRef} className="relative border-t border-[var(--o-line)] p-2.5">
          <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu"
            className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-[var(--o-card2)]">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--o-ink)] text-xs font-bold text-white">{initials || 'A'}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold leading-tight">{me.name || 'Admin'}</span>
              <span className="ops-mute block truncate text-xs">{isGlobal ? 'Global' : 'Regional'} · {scope}</span>
            </span>
            <ChevronsUpDown size={14} className="ops-mute flex-none" aria-hidden="true" />
          </button>
          <div className="hidden lg:block">{accountMenu(true)}</div>
        </div>
      </aside>

      <div className="ops-main">
        <header className="ops-topm sticky top-0 z-30 lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2" aria-label="OBN NATION home">
              <Image src="/brand/obn-logo-clear.webp" alt="" width={28} height={28} priority className="h-7 w-7" />
              <span className="font-display text-[13.5px] font-semibold tracking-tight">OBN NATION</span>
            </Link>
            <span className="ml-auto ops-chip hidden min-[380px]:inline-flex">{isGlobal ? 'Global' : 'Regional'} · {scope}</span>
            <div className="relative max-lg:ml-auto min-[380px]:ml-0">
              <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--o-ink)] text-xs font-bold text-white">{initials || 'A'}</button>
              <div className="lg:hidden">{accountMenu(false)}</div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1320px] px-4 pb-28 pt-5 lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      <nav aria-label="Admin tabs" className="ops-tabbar fixed inset-x-0 bottom-0 z-30 flex lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {items.map(({ id, href, label, Icon }) => (
          <Link key={id} href={href} className="ops-tab relative" aria-current={current === id ? 'page' : undefined}>
            <Icon size={20} aria-hidden="true" />{label}
            {id === 'review' && typeof reviewCount === 'number' && reviewCount > 0 && <span className="absolute left-1/2 top-1.5 ml-2 rounded-full bg-brand-red px-1.5 text-[10px] font-bold leading-4 text-white">{reviewCount}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
