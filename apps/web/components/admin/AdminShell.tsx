'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ClipboardCheck, Globe2, Home, LogOut, Package, Store } from 'lucide-react';
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

  return (
    <div className="ops-root">
      <div className="flex h-1.5" aria-hidden="true"><span className="flex-1 bg-brand-red" /><span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-blue" /></div>
      <header className="ops-top sticky top-0 z-30">
        <div className="mx-auto flex min-h-16 w-full max-w-[1400px] items-center gap-4 px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="OBN NATION home">
            <Image src="/brand/obn-logo-clear.webp" alt="" width={40} height={40} priority className="h-10 w-10" />
            <span className="font-display hidden text-lg font-extrabold tracking-tight sm:block">OBN NATION</span>
          </Link>
          <nav aria-label="Admin" className="ml-2 hidden items-center gap-1 md:flex">
            {items.map(({ id, href, label }) => (
              <Link key={id} href={href} className="ops-navlink" aria-current={current === id ? 'page' : undefined}>
                {label}
                {id === 'review' && typeof reviewCount === 'number' && reviewCount > 0 && <span className="ops-badge ops-b-red !px-2 !py-0.5">{reviewCount}</span>}
              </Link>
            ))}
          </nav>
          <span className="ml-auto" />
          <span className="ops-badge ops-b-mute hidden sm:inline-flex">{isGlobal ? 'Global' : 'Regional'} · {scope}</span>
          <div ref={menuRef} className="relative">
            <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu"
              className="flex h-11 min-w-11 items-center justify-center rounded-full bg-brand-blue px-1 text-sm font-extrabold text-white transition-colors hover:bg-[#0E4A91]">
              {initials || 'A'}
            </button>
            {menu && (
              <div role="menu" className="ops-menu">
                <div className="px-3 pb-2 pt-3">
                  <p className="truncate font-extrabold">{me.name || 'Admin'}</p>
                  <p className="ops-mute text-sm">{isGlobal ? 'Global Admin' : 'Regional Admin'} · {scope}</p>
                </div>
                <hr className="ops-rule mb-1" />
                <Link role="menuitem" href="/list" className="ops-menuitem"><Store size={18} aria-hidden="true" />Seller view</Link>
                <Link role="menuitem" href="/" className="ops-menuitem"><Home size={18} aria-hidden="true" />Home page</Link>
                <button role="menuitem" type="button" className="ops-menuitem" onClick={signOut} disabled={leaving}><LogOut size={18} aria-hidden="true" />{leaving ? 'Signing out…' : 'Sign out'}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 pb-32 pt-8 md:px-8 md:pb-16 md:pt-12">{children}</main>

      <nav aria-label="Admin tabs" className="ops-tabbar fixed inset-x-0 bottom-0 z-30 flex md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {items.map(({ id, href, label, Icon }) => (
          <Link key={id} href={href} className="ops-tab" aria-current={current === id ? 'page' : undefined}>
            <Icon size={22} aria-hidden="true" />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
