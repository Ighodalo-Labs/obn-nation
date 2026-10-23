'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ClipboardCheck, Globe2, Home, LogOut, Package, Search, Store } from 'lucide-react';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { ThemeToggle } from './ThemeToggle';
import { regionLabelOf } from './ui';

type Current = 'review' | 'pool' | 'global';
export interface ShellMe { name: string | null; role: 'regional_admin' | 'global_admin'; region: string | null }

/** Frame for every admin screen (Shopify admin style): dark top bar with search and account, light left nav, tab bar on phones. */
export function AdminShell({ current, me, reviewCount, children }: { current: Current; me: ShellMe; reviewCount?: number; children: ReactNode }) {
  const isGlobal = me.role === 'global_admin';
  const [leaving, setLeaving] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
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

  // On the Review screen the "/" key belongs to the table filter. Everywhere else it focuses the top search.
  useEffect(() => {
    if (current === 'review') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current]);

  // On the Review screen, typing here filters the table. On other screens, Enter jumps to Review with the search applied.
  function onSearch(v: string, submit: boolean) {
    if (current === 'review') window.dispatchEvent(new CustomEvent('ops:search', { detail: v }));
    else if (submit) window.location.href = `/admin/dashboard?q=${encodeURIComponent(v.trim().slice(0, 60))}`;
  }

  async function signOut() {
    setLeaving(true);
    try { await createBrowserSupabase().auth.signOut(); } finally { window.location.href = '/list'; }
  }

  const count = typeof reviewCount === 'number' && reviewCount > 0 ? reviewCount : null;

  return (
    <div className="ops-root">
      <header className="ops-top">
        <Link href="/admin/dashboard" className="ops-brand" aria-label="OBN NATION admin">
          <Image src="/brand/obn-logo-clear.webp" alt="" width={28} height={28} priority className="h-7 w-7 rounded-lg bg-[#0A0A0A] p-0.5" />
          <span className="hidden sm:inline">OBN NATION</span>
        </Link>
        <form className="ops-top-search" role="search" onSubmit={(e) => { e.preventDefault(); onSearch(searchRef.current?.value ?? '', true); }}>
          <Search size={15} aria-hidden="true" />
          <label htmlFor="ops-global-search" className="sr-only">Search listings</label>
          <input id="ops-global-search" ref={searchRef} type="search" placeholder="Search listings" maxLength={60} autoComplete="off"
            onChange={(e) => onSearch(e.target.value, false)} />
          {current !== 'review' && <kbd aria-hidden="true">/</kbd>}
        </form>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <div ref={menuRef} className="relative">
            <button type="button" className="ops-acct" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">
              <span className="ops-avatar">{initials || 'A'}</span>
              <span className="hidden sm:inline">{firstName}</span>
              <ChevronDown size={14} className="hidden sm:inline" aria-hidden="true" />
            </button>
            {menu && (
              <div role="menu" className="ops-menu right-0 top-[calc(100%+6px)]">
                <div className="px-2 pb-2 pt-1.5">
                  <p className="truncate text-[13px] font-semibold">{me.name || 'Admin'}</p>
                  <p className="ops-mute text-xs">{isGlobal ? 'Global Admin' : 'Regional Admin'} · {scope}</p>
                </div>
                <hr className="ops-divider mb-1" />
                <ThemeToggle variant="menu" />
                <Link role="menuitem" href="/list" className="ops-menuitem"><Store size={15} aria-hidden="true" />Seller view</Link>
                <Link role="menuitem" href="/" className="ops-menuitem"><Home size={15} aria-hidden="true" />Home page</Link>
                <button role="menuitem" type="button" className="ops-menuitem" onClick={signOut} disabled={leaving}><LogOut size={15} aria-hidden="true" />{leaving ? 'Signing out…' : 'Log out'}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="ops-shell">
        <nav aria-label="Admin" className="ops-side">
          {items.map(({ id, href, label, Icon }) => (
            <Link key={id} href={href} className="ops-navitem" aria-current={current === id ? 'page' : undefined}>
              <Icon size={16} aria-hidden="true" />{label}
              {id === 'review' && count !== null && <span className="ops-pillcount" data-hot="true">{count}</span>}
            </Link>
          ))}
          <p className="ops-navlabel">Other</p>
          <Link href="/list" className="ops-navitem"><Store size={16} aria-hidden="true" />Seller view</Link>
          <Link href="/" className="ops-navitem"><Home size={16} aria-hidden="true" />Home page</Link>
          <p className="ops-mute mt-auto px-2 pb-1 pt-6 text-xs">{scope}<br />Every action here is logged.</p>
        </nav>
        <main className="ops-main">{children}</main>
      </div>

      <nav aria-label="Admin tabs" className="ops-tabbar">
        {items.map(({ id, href, label, Icon }) => (
          <Link key={id} href={href} className="ops-tabitem" aria-current={current === id ? 'page' : undefined}>
            <Icon size={20} aria-hidden="true" />{label}
            {id === 'review' && count !== null && <span className="absolute left-1/2 top-1.5 ml-2.5 rounded-full bg-[var(--p-crit)] px-1.5 text-[10px] font-semibold leading-4 text-white">{count}</span>}
          </Link>
        ))}
      </nav>
    </div>
  );
}
