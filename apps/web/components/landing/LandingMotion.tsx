'use client';

import { useEffect, useLayoutEffect } from 'react';

const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Scroll reveals for the landing page. The page is complete without it (server-rendered).
 * GSAP loads after first paint, and only when the visitor has not asked for reduced motion.
 */
export function LandingMotion() {
  // The opening plays on every full page load, but not when someone comes back to Home from another page.
  useBeforePaint(() => {
    const w = window as unknown as { __obnIntroSeen?: boolean };
    if (w.__obnIntroSeen) document.documentElement.classList.add('no-intro');
    w.__obnIntroSeen = true;
  }, []);

  useEffect(() => {
    let revert: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set('[data-reveal]', { y: 28, opacity: 0 });
        ScrollTrigger.batch('[data-reveal]', {
          start: 'top 90%',
          once: true,
          onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.2)', stagger: { each: 0.07, from: 'start' } }),
        });
        gsap.utils.toArray<HTMLElement>('[data-drift]').forEach((el) => {
          gsap.fromTo(el, { yPercent: -4 }, {
            yPercent: 6, ease: 'none',
            scrollTrigger: { trigger: el.parentElement, start: 'top top', end: 'bottom top', scrub: true },
          });
        });
      });
      revert = () => mm.revert();
    })();
    return () => { cancelled = true; revert?.(); };
  }, []);
  return null;
}
