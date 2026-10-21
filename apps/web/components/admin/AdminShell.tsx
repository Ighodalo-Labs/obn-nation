'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ClipboardCheck, Globe2, Home, LogOut, Package, Store } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { ThemeToggle } from './ThemeToggle';
import { regionLabelOf } from './ui';

type Current = 'review' | 'pool' | 'global';
export interface ShellMe { name: string | null; role: 'regional_admin' | 'global_admin'; region: string | null }

/** Frame for every admin screen: a slim header, a tab bar on phones, a quiet footer. */
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
  const firstName = (me.name ?? '').trim().split(/\s+/)[0] || 'Admin';

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

  return (
    <div className="ops-root">
      <header className="ops-head sticky top-0 z-40">
        <div className="ops-inner flex h-14 items-center gap-2">
          <Link href="/" className="flex items-center gap-2.5" aria-label="OBN NATION home">
            <Image src="/brand/obn-logo-clear.webp" alt="" width={36} height={36} priority className="h-9 w-9 rounded-full bg-[#0A0A0A] p-0.5" />
            <span className="flex flex-col leading-none">
              <span className="font-display whitespace-nowrap text-[17px] font-extrabold tracking-tight">OBN NATION</span>
              <span className="mt-1 hidden text-[11px] font-semibold text-[var(--o-mute)] min-[400px]:block">Admin desk · {scope}</span>
            </span>
          </Link>
          <nav aria-label="Admin" className="ml-5 hidden items-center gap-1 lg:flex">
            {items.map(({ id, href, label }) => (
              <Link key={id} href={href} className="ops-pill" aria-current={current === id ? 'page' : undefined}>
                {label}
                {id === 'review' && typeof reviewCount === 'number' && reviewCount > 0 && <span className="ops-pill-count">{reviewCount}</span>}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link href="/list" className="ops-pill border border-[var(--o-line)] bg-[var(--o-card)] max-lg:!hidden"><Store size={16} aria-hidden="true" />Seller view</Link>
            <div ref={menuRef} className="relative">
              <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu"
                className="flex min-h-10 items-center gap-2 rounded-full border border-[var(--o-line)] bg-[var(--o-card)] py-0.5 pl-0.5 pr-0.5 text-left transition-colors hover:bg-[var(--o-card2)] sm:pr-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-red text-xs font-extrabold text-white">{initials || 'A'}</span>
                <span className="hidden text-sm font-semibold sm:inline">{firstName}</span>
                <ChevronDown size={14} className="hidden sm:inline" aria-hidden="true" />
              </button>
              {menu && (
                <div role="menu" className="ops-menu right-0 top-[calc(100%+8px)]">
                  <div className="px-3.5 pb-2 pt-2.5">
                    <p className="truncate text-sm font-bold">{me.name || 'Admin'}</p>
                    <p className="ops-mute text-xs font-medium">{isGlobal ? 'Global Admin' : 'Regional Admin'} · {scope}</p>
                  </div>
                  <hr className="ops-rule mb-1.5" />
                  <ThemeToggle variant="menu" />
                  <Link role="menuitem" href="/list" className="ops-menuitem"><Store size={16} aria-hidden="true" />Seller view</Link>
                  <Link role="menuitem" href="/" className="ops-menuitem"><Home size={16} aria-hidden="true" />Home page</Link>
                  <button role="menuitem" type="button" className="ops-menuitem" onClick={signOut} disabled={leaving}><LogOut size={16} aria-hidden="true" />{leaving ? 'Signing out…' : 'Sign out'}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="ops-foot pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0">
        <div className="ops-inner flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-8 text-[12.5px] font-medium">
          <p>OBN NATION admin desk · One Beta Nation</p>
          <p>Every action here is logged.</p>
        </div>
      </footer>

      <nav aria-label="Admin tabs" className="ops-tabbar fixed inset-x-0 bottom-0 z-30 flex lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {items.map(({ id, href, label, Icon }) => (
          <Link key={id} href={href} className="ops-tab relative" aria-current={current === id ? 'page' : undefined}>
            <Icon size={21} aria-hidden="true" />{label}
            {id === 'review' && typeof reviewCount === 'number' && reviewCount > 0 && <span className="absolute left-1/2 top-2 ml-2 rounded-full bg-brand-red px-1.5 text-[10px] font-extrabold leading-4 text-white">{reviewCount}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
