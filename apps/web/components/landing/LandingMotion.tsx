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
        const root = document.querySelector<HTMLElement>('.intro');
        if (!root || document.documentElement.classList.contains('no-intro')) return;
        const mobile = window.innerWidth < 768;
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        const mx = cx - (mobile ? 60 : 110), my = cy - (mobile ? 90 : 110);
        const spots = [
          { x: -0.78 * mx, y: -0.55 * my, r: -12 }, { x: 0.8 * mx, y: -0.4 * my, r: 10 },
          { x: -0.6 * mx, y: 0.7 * my, r: -8 }, { x: 0.65 * mx, y: 0.66 * my, r: 14 },
          { x: 0.05 * mx, y: -0.92 * my, r: -6 },
        ];
        const items = gsap.utils.toArray<HTMLElement>('.intro-item');
        const nav = document.querySelector<HTMLElement>('#nav-logo');
        const logo = root.querySelector<HTMLElement>('.intro-logo')!;
        const nr = nav?.getBoundingClientRect();
        const dx = nr ? nr.left + nr.width / 2 - cx : 0, dy = nr ? nr.top + nr.height / 2 - cy : 0;
        const ts = nr ? nr.width / logo.getBoundingClientRect().width : 0.2;
        if (nav) gsap.set(nav, { opacity: 0 });
        const tl = gsap.timeline({ delay: 0.1, onComplete: () => { root.style.display = 'none'; } });
        tl.to('.intro .rev', { clipPath: 'circle(100% at 50% 50%)', duration: 0.8, ease: 'power4.inOut', stagger: 0.15 });
        tl.set('.intro .rev-1, .intro .rev-2, .intro .rev-3', { display: 'none' });
        tl.addLabel('in', '-=0.2');
        tl.to(logo, { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.5)' }, 'in');
        items.forEach((el, i) => tl.to(el, { x: spots[i].x, y: spots[i].y, rotation: spots[i].r, scale: 1, duration: 1, ease: 'back.out(1.2)' }, 'in'));
        tl.to({}, { duration: 0.2 });
        tl.addLabel('out');
        items.forEach((el) => tl.to(el, { scale: 0, opacity: 0, duration: 0.5, ease: 'power3.in' }, 'out'));
        tl.to('.intro-bg, .intro .rev-4', { opacity: 0, duration: 0.7, ease: 'power2.out' }, 'out+=0.1');
        tl.to(logo, { x: dx, y: dy, scale: ts, opacity: 0, duration: 0.8, ease: 'power3.inOut' }, 'out');
        if (nav) tl.to(nav, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 'out+=0.5');
        return () => { tl.kill(); if (nav) gsap.set(nav, { clearProps: 'opacity' }); };
      });
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
