'use client';

import { useEffect } from 'react';

/**
 * Scroll reveals for the landing page. The page is complete without it (server-rendered).
 * GSAP loads after first paint, and only when the visitor has not asked for reduced motion.
 */
export function LandingMotion() {
  useEffect(() => {
    let revert: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.fromTo(el, { y: 28, opacity: 0 }, {
            y: 0, opacity: 1, duration: 0.9, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
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
