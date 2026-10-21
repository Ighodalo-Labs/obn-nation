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
          <aside className="hidden flex-col gap-6 lg:flex" aria-hidden="true">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#0A0A0A]">
              {['/photos/living-room.webp', '/photos/tv-wall.webp', '/photos/kitchen.webp', '/photos/devices.webp'].map((src, i) => (
                <Image key={src} src={src} alt="" fill priority={i === 0} sizes="520px" className="slide object-cover" style={{ animationDelay: `${i * 6 - 0.5}s` }} />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <p className="font-display absolute bottom-6 left-6 right-6 text-4xl font-extrabold leading-[1.05] tracking-tight">Sell what you don’t use.</p>
            </div>
            <ol className="grid gap-3">
              {STEPS.map(([color, title, text], i) => (
                <li key={title} className={`${color} flex items-center gap-4 rounded-2xl p-4 text-white`}>
                  <span className="font-display w-8 text-3xl font-extrabold text-white/50">{i + 1}</span>
                  <span className="flex flex-col"><span className="font-semibold">{title}</span><span className="text-sm text-white/85">{text}</span></span>
                </li>
              ))}
            </ol>
          </aside>
          <main className="min-w-0 lg:self-start lg:overflow-hidden lg:rounded-3xl lg:border lg:border-white/10 lg:bg-surface lg:p-8 lg:shadow-[0_30px_80px_-30px_rgba(0,0,0,.8)]">{children}</main>
        </div>
      </div>
      <Footer />
    </>
  );
}
