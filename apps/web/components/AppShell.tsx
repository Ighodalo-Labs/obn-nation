import Image from 'next/image';
import type { ReactNode } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';

const STEPS = [
  ['bg-brand-red', 'Add your item', 'Photos, a short video and your price.'],
  ['bg-brand-blue', 'An admin checks it', 'Someone in your area looks it over.'],
  ['bg-brand-green', 'It goes live', 'Buyers near you can see it.'],
] as const;

const SLIDES = ['/photos/living-room.webp', '/photos/kitchen.webp', '/photos/devices.webp', '/photos/tv-wall.webp'];

/**
 * One frame for the seller screens (sign in, list, fix). A light, warm "sell app" look.
 * Phone: the form card fills the width. Desktop: a photo panel on the left, the form card on the right.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="sell-root ml-[calc(50%-50vw)] min-h-screen w-screen bg-[#FAF7F2] text-[#16140F]">
      <style>{'html,body{background:#FAF7F2 !important;color:#16140F}'}</style>
      <Header />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14 lg:py-12">
        <aside className="hidden lg:block" aria-hidden="true">
          <div className="sticky top-28 flex flex-col gap-8">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-[#16140F] shadow-[0_40px_80px_-40px_rgba(22,20,15,.7)]">
              {SLIDES.map((src, i) => (
                <Image key={src} src={src} alt="" fill priority={i === 0} sizes="480px" className="slide object-cover" style={{ animationDelay: `${i * 6 - 0.5}s` }} />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-[#16140F]/90 via-[#16140F]/10 to-transparent" />
              <div className="absolute inset-x-8 bottom-8 text-white">
                <p className="font-display text-5xl font-extrabold leading-[1] tracking-[-0.04em]">Sell what<br />you don’t use.</p>
                <p className="mt-3 max-w-xs text-base text-white/80">Takes about five minutes. Free to list.</p>
              </div>
            </div>
            <ol className="grid gap-4">
              {STEPS.map(([color, title, text], i) => (
                <li key={title} className="flex items-stretch gap-4">
                  <span className={`w-1.5 rounded-full ${color}`} />
                  <span className="flex flex-col py-0.5">
                    <span className="font-display text-lg font-extrabold tracking-tight">{`0${i + 1}`} {title}</span>
                    <span className="text-sm text-[#6B655A]">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
        <main className="min-w-0 lg:self-start">
          <div className="rounded-[2rem] border border-[#EDE6D9] bg-white p-5 shadow-[0_30px_70px_-45px_rgba(22,20,15,.45)] sm:p-9">{children}</div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
