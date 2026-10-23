'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Item = { href: string; label: string };

/**
 * Phone menu. The panel is a fixed overlay rendered into <body>, so it never changes the page layout
 * and is not trapped by the header's blur. Page scroll is locked while it is open and restored on close.
 */
export function MobileMenu({ items, cta, tone = 'dark' }: { items: Item[]; cta?: Item; tone?: 'dark' | 'light' }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closer = useRef<HTMLButtonElement>(null);
  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    closer.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onResize = () => { if (window.innerWidth >= 768) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  const light = tone === 'light';
  const openBtn = light
    ? 'border-[#16140F]/20 text-[#16140F] hover:bg-[#16140F] hover:text-white'
    : 'border-white/30 text-white hover:bg-white hover:text-[#0A0A0A]';

  return (
    <>
      <button
        ref={opener}
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
        className={`ml-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors md:hidden ${openBtn}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {mounted && open && createPortal(
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-[#0A0A0A] text-white md:hidden">
          <div className="flex h-1 shrink-0" aria-hidden="true">
            <span className="flex-1 bg-brand-red" /><span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-blue" />
          </div>
          <div className="flex items-center gap-2 px-4 py-2">
            <Link href="/" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3" aria-label="OBN NATION home">
              <Image src="/brand/obn-logo-clear.webp" alt="" width={44} height={44} className="h-11 w-11 rounded-full bg-[#0A0A0A] p-0.5" />
              <span className="text-base font-semibold tracking-wide">OBN NATION</span>
            </Link>
            <button ref={closer} type="button" aria-label="Close menu" onClick={close} className="ml-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white hover:text-[#0A0A0A]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <nav aria-label="Menu" className="flex flex-1 flex-col gap-1 px-4 pt-6">
            {items.map((i) => (
              <Link key={i.href + i.label} href={i.href} onClick={() => setOpen(false)} className="flex min-h-14 items-center border-b border-white/10 text-2xl font-semibold transition-colors hover:text-brand-red">
                {i.label}
              </Link>
            ))}
          </nav>
          {cta && (
            <div className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
              <Link href={cta.href} onClick={() => setOpen(false)} className="flex min-h-14 w-full items-center justify-center rounded-full bg-brand-red px-6 text-base font-semibold text-white transition-colors hover:bg-brand-green">
                {cta.label}
              </Link>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
