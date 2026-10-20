'use client';

import { useEffect } from 'react';

/**
 * All scroll motion for the landing page. The page is complete without it (server-rendered, CSS-only fallbacks).
 * GSAP loads after first paint, and only when the visitor has not asked for reduced motion.
 */
export function LandingMotion() {
  // Story phone follows the step in view. Plain observer, no GSAP needed.
  useEffect(() => {
    const phone = document.querySelector<HTMLElement>('#story .phone');
    const steps = Array.from(document.querySelectorAll<HTMLElement>('[data-step]'));
    if (!phone || steps.length === 0 || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = (e.target as HTMLElement).dataset.step ?? '0';
          phone.dataset.stage = i;
          steps.forEach((s) => s.toggleAttribute('data-active', s.dataset.step === i));
        }
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    steps.forEach((s) => io.observe(s));
    steps[0]?.setAttribute('data-active', '');
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Parallax: outer wrappers drift at different speeds while scrolling.
        gsap.utils.toArray<HTMLElement>('[data-speed]').forEach((el) => {
          const s = Number(el.dataset.speed ?? 0);
          gsap.to(el, { yPercent: s * -40, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
        });

        // Headline lines slide up out of a mask as they enter.
        gsap.utils.toArray<HTMLElement>('[data-lines]').forEach((el) => {
          gsap.from(el.querySelectorAll('[data-line]'), {
            yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.12,
            scrollTrigger: { trigger: el, start: 'top 88%' },
          });
        });

        // Category ribbons: speed up with scroll speed, then settle.
        gsap.utils.toArray<HTMLElement>('.marquee-track').forEach((track) => {
          const reverse = track.classList.contains('reverse');
          track.style.animation = 'none';
          const tween = gsap.fromTo(track, { xPercent: reverse ? -50 : 0 }, { xPercent: reverse ? 0 : -50, duration: 40, ease: 'none', repeat: -1 });
          ScrollTrigger.create({
            trigger: track, start: 'top bottom', end: 'bottom top',
            onUpdate: (self) => {
              const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 250, 6);
              gsap.to(tween, { timeScale: boost, duration: 0.2, overwrite: true });
              gsap.to(tween, { timeScale: 1, duration: 1.2, delay: 0.2 });
            },
          });
        });

        // Closing call to action: the three brand bars sweep across as you arrive.
        gsap.utils.toArray<HTMLElement>('[data-bar]').forEach((bar, i) => {
          gsap.fromTo(bar, { scaleX: 0 }, {
            scaleX: 1, transformOrigin: 'left center', ease: 'none',
            scrollTrigger: { trigger: '#closing', start: `top ${95 - i * 6}%`, end: 'top 35%', scrub: true },
          });
        });
      });
      cleanup = () => mm.revert();
    })();
    return () => { cancelled = true; cleanup(); };
  }, []);

  return null;
}
