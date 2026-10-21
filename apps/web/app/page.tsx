import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { LandingMotion } from '@/components/landing/LandingMotion';
import { ListingCard } from '@/components/landing/ListingCard';

const ABOUT = [
  'OBN NATION (One Beta Nation) is a Nigerian community-driven decluttering and asset-liquidation marketplace and advertising company. We connect people with products, services, opportunities and trusted transactions by helping individuals and businesses turn unused assets into value.',
  'Through our community networks, advertising channels and associate network, we help sellers reach potential buyers while making quality, affordable items more accessible to our communities. Our model combines community commerce, marketing and trust-focused transaction support.',
  'We believe that trust is an asset, reputation is capital, and integrity is a long-term business strategy. Our mission is to make buying, selling and decluttering easier by connecting people and creating value within our communities.',
];

const STEPS = [
  { title: 'Add your item', text: 'Take clear photos, record a short video and set your price. It all happens on your phone.' },
  { title: 'An admin checks it', text: 'Someone in your region reviews it. If it is not right, you get the reason and a link to fix it.' },
  { title: 'It goes live', text: 'Approved items show to buyers in your region. Your listing is ready to sell.' },
];

const CATEGORIES = ['Phones', 'Computers', 'TVs', 'Fridges', 'Generators', 'Kitchen', 'Furniture', 'Other'];

const SHOTS = [
  { src: '/photos/tv-wall.webp', label: 'TVs', offset: 'lg:mt-0' },
  { src: '/photos/devices.webp', label: 'Phones and computers', offset: 'lg:mt-20' },
  { src: '/photos/kitchen.webp', label: 'Fridges and kitchen', offset: 'lg:mt-8' },
  { src: '/photos/living-room.webp', label: 'Furniture', offset: 'lg:mt-28' },
];

const TRUST = [
  { title: 'Checked before it shows', text: 'An admin in your region reviews every listing before any buyer sees it.', bar: 'bg-brand-red' },
  { title: 'Clear reasons, easy fixes', text: 'If a listing is turned down, you get the reason and a link to fix it and send it again.', bar: 'bg-brand-green' },
  { title: 'Bad sellers are blocked', text: 'Admins can block a seller for good. Honest sellers keep the marketplace worth using.', bar: 'bg-brand-blue' },
];

const FAQ = [
  { q: 'How do I sign in?', a: 'Enter your phone number. We send you a code. No password to remember.' },
  { q: 'What do I need to list an item?', a: 'One to six clear photos, one short video of up to 60 seconds, a title, a price and your location. The app shrinks the files for you.' },
  { q: 'Who checks my listing?', a: 'An admin for your region. Your region comes from the link you joined with.' },
  { q: 'What if my listing is turned down?', a: 'You see the reason. Use the link we give you to fix it and send it again. The link works for 30 days.' },
  { q: 'How many items can I list in a day?', a: 'Up to 10 a day.' },
];

// LP-4: title, description from the first sentence of the About copy, and Open Graph.
export const metadata: Metadata = {
  title: 'OBN NATION — Connecting People',
  description: ABOUT[0].split('. ')[0] + '.',
  openGraph: { title: 'OBN NATION — Connecting People', description: ABOUT[0].split('. ')[0] + '.', type: 'website' },
};

const BLEED = 'relative left-1/2 w-screen -translate-x-1/2';
const INNER = 'mx-auto w-full max-w-6xl px-5';
const BUTTON =
  'flex min-h-12 items-center justify-center rounded-full px-7 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const H2 = 'text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl';

function Ribbon({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="overflow-hidden" aria-hidden={reverse ? 'true' : undefined}>
      <div className={`marquee-track ${reverse ? 'reverse' : ''}`}>
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 ? 'true' : undefined}>
            {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
              <li key={`${c}-${i}`} className={`px-8 text-[clamp(2.4rem,6vw,4.5rem)] font-semibold tracking-[-0.03em] ${reverse ? 'text-white/20' : 'text-white'}`}>
                {c}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

/** Gateway page (PRD 6.1). Server-rendered and complete without scripts. Motion is added on top. */
export default function Home() {
  return (
    <main className="bg-[#F2F2F0] pb-24 text-[#0A0A0A]">
      <style>{`html,body{background:#F2F2F0 !important;color:#0A0A0A}`}</style>
      <LandingMotion />

      {/* Opening: logo, then red, green and blue rings close like an iris */}
      <div className="intro" aria-hidden="true">
        <div className="l3" /><div className="l2" /><div className="l1" />
        <div className="l0">
          <Image src="/brand/obn-logo-clear.webp" alt="" width={720} height={720} priority className="logo h-[min(60vw,300px)] w-[min(60vw,300px)]" />
        </div>
      </div>

      {/* Hero: dark panel with the headline, a sharp undimmed photo beside it */}
      <section className={`${BLEED} grain overflow-hidden bg-[#0A0A0A] text-white`}>
        <div className="relative z-10 flex h-1.5 w-full" aria-hidden="true">
          <span className="flex-1 bg-brand-red" /><span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-blue" />
        </div>
        <div className={`${INNER} relative z-10 flex items-center justify-between py-4`}>
          <div className="flex items-center gap-3">
            <Image src="/brand/obn-logo-clear.webp" alt="OBN NATION" width={64} height={64} priority className="h-14 w-14 sm:h-16 sm:w-16" />
            <span className="text-lg font-semibold tracking-tight">OBN NATION</span>
          </div>
          <nav aria-label="Main" className="flex items-center gap-1 rounded-full bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
            <a href="#story" className="hidden min-h-10 items-center rounded-full px-3 text-sm font-medium text-white/85 hover:text-white md:flex">How it works</a>
            <a href="#trust" className="hidden min-h-10 items-center rounded-full px-3 text-sm font-medium text-white/85 hover:text-white md:flex">Safety</a>
            <a href="#faq" className="hidden min-h-10 items-center rounded-full px-3 text-sm font-medium text-white/85 hover:text-white md:flex">FAQ</a>
            <a href="#about" className="hidden min-h-10 items-center rounded-full px-3 text-sm font-medium text-white/85 hover:text-white md:flex">About</a>
            <Link href="/list" className="flex min-h-10 items-center rounded-full bg-brand-red px-4 text-sm font-semibold text-white">List an item</Link>
          </nav>
        </div>

        <div className={`${INNER} relative z-10 grid items-center gap-12 pb-20 pt-8 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pb-28 lg:pt-12`}>
          <div>
            <h1 className="text-[clamp(2.8rem,6.4vw,5.4rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
              <span className="line-mask"><span style={{ ['--d' as string]: '.1s' }}>Sell what</span></span>
              <span className="line-mask"><span style={{ ['--d' as string]: '.25s' }}>you don’t use.</span></span>
            </h1>
            <p className="hero-fade mt-6 max-w-md text-lg leading-relaxed text-white/75" style={{ ['--d' as string]: '.7s' }}>
              Clear out and cash in. List in minutes, get checked, reach buyers near you.
            </p>
            <div className="hero-fade mt-8 flex flex-col gap-3 sm:flex-row" style={{ ['--d' as string]: '.9s' }}>
              <Link href="/list" className={`${BUTTON} bg-brand-red text-white hover:bg-[#B71C1C] sm:min-w-44`}>List an item</Link>
              <a href="#story" className={`${BUTTON} border border-white/35 text-white hover:bg-white/10 sm:min-w-44`}>See how it works</a>
            </div>
          </div>
          <div className="hero-fade relative mx-auto aspect-square w-full max-w-[32rem]" style={{ ['--d' as string]: '.4s' }}>
            <div className="absolute -left-6 top-4 h-64 w-64 rounded-full bg-brand-red/35 blur-[90px]" aria-hidden="true" />
            <div className="absolute -right-6 top-24 h-64 w-64 rounded-full bg-brand-blue/40 blur-[90px]" aria-hidden="true" />
            <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-brand-green/35 blur-[90px]" aria-hidden="true" />
            <Image src="/brand/obn-logo-clear.webp" alt="OBN NATION: people holding hands around the globe" fill priority sizes="(min-width:1024px) 512px, 90vw" className="settle object-contain" />
          </div>
        </div>
      </section>

      {/* Category ribbons */}
      <section aria-label="What people sell" className={`${BLEED} grain flex flex-col gap-1 overflow-hidden border-t border-white/10 bg-[#0A0A0A] py-8`}>
        <Ribbon />
        <Ribbon reverse />
      </section>

      {/* Human story with photos */}
      <section aria-labelledby="home-h" className={BLEED}>
        <div className={`${INNER} py-16 lg:py-28`}>
          <h2 id="home-h" data-lines className={`max-w-3xl ${H2}`}>
            <span className="mask"><span data-line className="block">Someone near you</span></span>
            <span className="mask"><span data-line className="block">needs what you don’t.</span></span>
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-[#4B4B47]">
            The fridge you replaced. The sofa from the old flat. A neighbour is looking for them.
          </p>
          <p className="mt-4 text-lg font-medium">We start in Port Harcourt, Delta and Ekiti.</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3 lg:items-start">
            {SHOTS.map((s) => (
              <figure key={s.label} className={`photo-card ${s.offset}`}>
                <div data-photo className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#DEDEDA]">
                  <Image data-photo-img src={s.src} alt="" fill sizes="(min-width:1024px) 360px, 100vw" className="scale-[1.15] object-cover" />
                </div>
                <figcaption className="mt-3 border-b border-[#0A0A0A]/15 pb-3 text-lg font-medium">{s.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* How it works: the card follows the step you are reading */}
      <section id="story" aria-labelledby="story-h" className={`${BLEED} grain bg-[#171717] text-white`}>
        <div className={`${INNER} relative z-10 py-16 lg:py-28`}>
          <h2 id="story-h" data-lines className={`max-w-3xl ${H2}`}>
            <span className="mask"><span data-line className="block">From your room</span></span>
            <span className="mask"><span data-line className="block">to your region.</span></span>
          </h2>
          <div className="mt-8 grid gap-6 lg:mt-14 lg:grid-cols-2 lg:gap-16">
            <div className="sticky top-0 z-10 -mx-5 bg-[#171717]/95 px-5 pb-3 pt-3 backdrop-blur lg:static lg:order-2 lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <div className="lg:sticky lg:top-24 lg:flex lg:justify-center">
                <ListingCard mode="stage" stage={0} className="w-full max-w-[22rem] [&_figcaption]:text-white/60" />
              </div>
            </div>
            <ol className="lg:order-1">
              {STEPS.map((s, i) => (
                <li key={s.title} data-step={i} className="flex min-h-[40vh] flex-col justify-center opacity-35 transition-opacity duration-500 data-[active]:opacity-100 lg:min-h-[64vh]">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold text-white ${['bg-brand-red', 'bg-brand-green', 'bg-brand-blue'][i]}`} aria-hidden="true">{i + 1}</span>
                  <h3 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{s.title}</h3>
                  <p className="mt-3 max-w-md text-lg leading-relaxed text-white/70">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section id="trust" aria-labelledby="trust-h" className={BLEED}>
        <div className={`${INNER} py-16 lg:py-28`}>
          <h2 id="trust-h" data-lines className={`max-w-3xl ${H2}`}>
            <span className="mask"><span data-line className="block">A real person checks</span></span>
            <span className="mask"><span data-line className="block">every listing.</span></span>
          </h2>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-[#0A0A0A]/15 sm:grid-cols-3">
            {TRUST.map((t) => (
              <li key={t.title} className="bg-[#F2F2F0] p-7">
                <span className={`mb-5 block h-1 w-12 rounded-full ${t.bar}`} aria-hidden="true" />
                <h3 className="text-xl font-semibold tracking-tight">{t.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[#4B4B47]">{t.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-h" className={`${BLEED} bg-white/50`}>
        <div className={`${INNER} grid gap-10 py-16 lg:grid-cols-[.8fr_1.2fr] lg:py-28`}>
          <h2 id="faq-h" className="text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl">Questions, answered.</h2>
          <div className="divide-y divide-[#0A0A0A]/15 border-y border-[#0A0A0A]/15">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex min-h-12 items-center justify-between gap-6 text-lg font-medium">
                  {f.q}
                  <span className="plus flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#0A0A0A]/25 text-xl leading-none transition-transform" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-[#4B4B47]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Values and About */}
      <section aria-labelledby="values-h" className={BLEED}>
        <div className={`${INNER} py-16 lg:py-28`}>
          <h2 id="values-h" data-lines className="text-[clamp(2.3rem,6vw,4.8rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
            <span className="mask"><span data-line className="block">Trust is an asset.</span></span>
            <span className="mask"><span data-line className="block text-[#0A0A0A]/55">Reputation is capital.</span></span>
            <span className="mask"><span data-line className="block text-[#0A0A0A]/30">Integrity lasts.</span></span>
          </h2>
          <div id="about" className="mt-14 grid gap-8 border-t border-[#0A0A0A]/15 pt-10 lg:grid-cols-[.7fr_1.3fr]">
            <h3 className="text-2xl font-semibold">About OBN NATION</h3>
            <div className="flex flex-col gap-4">
              {ABOUT.map((p) => (
                <p key={p.slice(0, 20)} className="max-w-prose text-base leading-relaxed text-[#2A2A28]">{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Closing call to action over a real photo */}
      <section className={`${BLEED} overflow-hidden`}>
        <div data-photo className="relative">
          <div className="absolute inset-0">
            <Image data-photo-img src="/photos/tv-wall.webp" alt="" fill sizes="100vw" className="scale-[1.15] object-cover" />
            <div className="absolute inset-0 bg-[#0A0A0A]/70" />
          </div>
          <div className={`${INNER} relative flex flex-col items-center py-24 text-center text-white lg:py-36`}>
            <h2 className="text-[clamp(2.4rem,6.5vw,5rem)] font-semibold leading-[1.03] tracking-[-0.04em]">Got something to sell?</h2>
            <Link href="/list" className={`${BUTTON} mt-8 min-w-56 bg-brand-red text-white hover:bg-[#B71C1C]`}>List an item</Link>
          </div>
        </div>
      </section>

      <footer className={`${BLEED} flex flex-col items-center gap-3 bg-[#0A0A0A] px-5 py-12 text-center text-sm text-white/70`}>
        <Image src="/brand/obn-logo-clear.webp" alt="OBN NATION" width={120} height={120} className="h-28 w-28" />
        <p>OBN NATION Online. Connecting People.</p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#0A0A0A]/10 bg-[#F2F2F0]/90 p-4 backdrop-blur">
        <div className="mx-auto w-full max-w-screen480">
          <Link href="/list" className={`${BUTTON} bg-brand-red text-white hover:bg-[#B71C1C]`}>List an item</Link>
        </div>
      </div>
    </main>
  );
}
