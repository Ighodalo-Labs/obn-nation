import Image from 'next/image';
import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { BLEED, Header } from './Header';

const STEPS = [
  ['bg-brand-red', 'Add your item', 'Photos, a short video and the price.'],
  ['bg-brand-blue', 'An admin checks it', 'Someone in your area looks it over.'],
  ['bg-brand-green', 'It goes live', 'Buyers near you can see it.'],
] as const;

/**
 * One frame for the seller screens (sign in, list, fix). Phone: the form fills the width.
 * Desktop: a brand panel on the left, the form in a clear column on the right.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <div className={`${BLEED} px-4`}>
        <div className="mx-auto grid max-w-5xl gap-12 py-6 lg:grid-cols-[1fr_minmax(0,480px)] lg:py-12">
          <aside className="hidden flex-col gap-8 lg:flex" aria-hidden="true">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
              <Image src="/photos/people/friends-phones-street.webp" alt="" fill sizes="520px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <p className="absolute bottom-6 left-6 right-6 text-3xl font-semibold leading-tight">Sell what you don’t use.</p>
            </div>
            <ol className="flex flex-col gap-4">
              {STEPS.map(([color, title, text], i) => (
                <li key={title} className="flex items-start gap-4">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${color}`}>{i + 1}</span>
                  <span className="flex flex-col"><span className="font-semibold">{title}</span><span className="text-sm text-muted">{text}</span></span>
                </li>
              ))}
            </ol>
          </aside>
          <main className="min-w-0 lg:self-start lg:rounded-3xl lg:border lg:border-white/10 lg:bg-surface lg:p-8">{children}</main>
        </div>
      </div>
      <Footer />
    </>
  );
}
