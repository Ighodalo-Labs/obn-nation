import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { PRODUCTS, Phone, Sofa, Tv } from '@/components/landing/Art';
import { LandingMotion } from '@/components/landing/LandingMotion';
import { ListingPhone } from '@/components/landing/ListingPhone';

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

// LP-4: title, description from the first sentence of the About copy, and Open Graph.
export const metadata: Metadata = {
  title: 'OBN NATION — Connecting People',
  description: ABOUT[0].split('. ')[0] + '.',
  openGraph: { title: 'OBN NATION — Connecting People', description: ABOUT[0].split('. ')[0] + '.', type: 'website' },
};

const BLEED = 'relative left-1/2 w-screen -translate-x-1/2';
const INNER = 'mx-auto w-full max-w-6xl px-5';
const BUTTON =
  'flex min-h-12 items-center justify-center rounded-full px-7 text-base font-semibold text-white transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function Ribbon({ reverse = false }: { reverse?: boolean }) {
  const items = [...PRODUCTS, ...PRODUCTS];
  return (
    <div className="overflow-hidden" aria-hidden={reverse ? 'true' : undefined}>
      <div className={`marquee-track ${reverse ? 'reverse' : ''}`} style={{ ['--t' as string]: reverse ? '46s' : '38s' }}>
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center gap-4 pr-4" aria-hidden={copy === 1 ? 'true' : undefined}>
            {items.map(({ name, Art }, i) => (
              <li key={`${name}-${i}`} className="flex items-center gap-3 rounded-full border border-border bg-surface py-2 pl-2 pr-6">
                <Art className="h-12 w-12" />
                <span className="text-lg font-semibold">{name}</span>
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
    <main className="pb-24">
      <LandingMotion />

      {/* Hero */}
      <section className={`${BLEED} overflow-hidden`}>
        <div className="flex h-1.5 w-full" aria-hidden="true">
          <span className="flex-1 bg-brand-red" /><span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-blue" />
        </div>
        <div className="pointer-events-none absolute -right-40 top-10 h-[34rem] w-[34rem] rounded-full bg-brand-blue/20 blur-[120px]" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-40 top-64 h-[28rem] w-[28rem] rounded-full bg-brand-red/20 blur-[120px]" aria-hidden="true" />
        <div className={`${INNER} relative grid items-center gap-10 py-10 lg:grid-cols-[1.15fr_.85fr] lg:py-20`}>
          <div>
            <Image src="/brand/obn-logo-on-black.jpg" alt="OBN NATION" width={72} height={72} priority className="hero-fade rounded-full" style={{ ['--d' as string]: '.1s' }} />
            <h1 className="mt-6 text-[clamp(2.9rem,7.4vw,5.6rem)] font-extrabold leading-[.95] tracking-[-0.045em]">
              <span className="line-mask"><span style={{ ['--d' as string]: '.15s' }}>Sell what</span></span>
              <span className="line-mask"><span style={{ ['--d' as string]: '.3s' }}>you don’t use.</span></span>
            </h1>
            <p className="hero-fade mt-6 max-w-lg text-lg leading-relaxed text-muted" style={{ ['--d' as string]: '.8s' }}>
              OBN NATION is where Nigerians clear out and cash in. List an item in minutes, get it checked, and reach buyers in your community.
            </p>
            <div className="hero-fade mt-8 flex flex-col gap-3 sm:flex-row" style={{ ['--d' as string]: '1s' }}>
              <Link href="/list" className={`${BUTTON} bg-brand-red sm:min-w-44`}>List an item</Link>
              <a href="#story" className={`${BUTTON} border border-white/20 bg-white/5 sm:min-w-44`}>See how it works</a>
            </div>
          </div>

          <div className="hero-fade relative mx-auto w-full max-w-sm pb-8 lg:max-w-none" style={{ ['--d' as string]: '.6s' }}>
            <div data-speed=".25" className="absolute -left-2 top-6 z-10 hidden sm:block">
              <div className="bob rounded-2xl border border-border bg-surface/90 p-3 backdrop-blur" style={{ ['--r' as string]: '-8deg', ['--t' as string]: '6s' }}><Tv className="h-16 w-16" /></div>
            </div>
            <div data-speed=".5" className="absolute -right-2 top-1/3 z-10">
              <div className="bob rounded-2xl border border-border bg-surface/90 p-3 backdrop-blur" style={{ ['--r' as string]: '7deg', ['--t' as string]: '8s', ['--d' as string]: '-2s' }}><Phone className="h-14 w-14" /></div>
            </div>
            <div data-speed=".15" className="absolute bottom-10 left-0 z-10 hidden sm:block">
              <div className="bob rounded-2xl border border-border bg-surface/90 p-3 backdrop-blur" style={{ ['--r' as string]: '5deg', ['--t' as string]: '7s', ['--d' as string]: '-4s' }}><Sofa className="h-16 w-16" /></div>
            </div>
            <ListingPhone mode="auto" />
          </div>
        </div>
      </section>

      {/* Category ribbons */}
      <section aria-label="What people sell" className={`${BLEED} flex flex-col gap-4 py-6`}>
        <Ribbon />
        <Ribbon reverse />
      </section>

      {/* How it works: the phone follows the step you are reading */}
      <section id="story" aria-labelledby="story-h" className={`${BLEED} bg-bg`}>
        <div className={`${INNER} py-16 lg:py-24`}>
          <h2 id="story-h" data-lines className="max-w-3xl text-4xl font-extrabold leading-[1] tracking-[-0.04em] sm:text-6xl">
            <span className="mask"><span data-line className="block">From your room</span></span>
            <span className="mask"><span data-line className="block">to your region.</span></span>
          </h2>
          <div className="mt-8 grid gap-6 lg:mt-14 lg:grid-cols-2 lg:gap-16">
            <div className="sticky top-0 z-10 -mx-5 h-[300px] bg-bg/95 px-5 pt-3 backdrop-blur lg:static lg:order-2 lg:mx-0 lg:h-auto lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <div className="origin-top scale-[.56] lg:sticky lg:top-20 lg:scale-100">
                <ListingPhone mode="stage" stage={0} />
              </div>
            </div>
            <ol className="lg:order-1">
              {STEPS.map((s, i) => (
                <li key={s.title} data-step={i} className="group flex min-h-[46vh] flex-col justify-center opacity-40 transition-opacity duration-500 data-[active]:opacity-100 lg:min-h-[64vh]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-red text-lg font-bold" aria-hidden="true">{i + 1}</span>
                  <h3 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">{s.title}</h3>
                  <p className="mt-3 max-w-md text-lg leading-relaxed text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Values */}
      <section aria-labelledby="values-h" className={`${BLEED} overflow-hidden bg-surface`}>
        <div className={`${INNER} py-16 lg:py-24`}>
          <h2 id="values-h" data-lines className="text-[clamp(2.4rem,7vw,5.2rem)] font-extrabold leading-[1] tracking-[-0.04em]">
            <span className="mask"><span data-line className="block">Trust is an asset.</span></span>
            <span className="mask"><span data-line className="block text-white/55">Reputation is capital.</span></span>
            <span className="mask"><span data-line className="block text-white/30">Integrity lasts.</span></span>
          </h2>
          <div id="about" className="mt-12 grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
            <h3 className="text-2xl font-bold">About OBN NATION</h3>
            <div className="flex flex-col gap-4">
              {ABOUT.map((p) => (
                <p key={p.slice(0, 20)} className="max-w-prose text-base leading-relaxed text-white/85">{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section id="closing" className={`${BLEED} overflow-hidden`}>
        <div className="absolute inset-0 flex flex-col" aria-hidden="true">
          <span data-bar className="flex-1 bg-brand-red" /><span data-bar className="flex-1 bg-brand-green" /><span data-bar className="flex-1 bg-brand-blue" />
        </div>
        <div className={`${INNER} relative flex flex-col items-center py-20 text-center lg:py-32`}>
          <h2 className="text-[clamp(2.6rem,8vw,6rem)] font-extrabold leading-[.98] tracking-[-0.04em] drop-shadow-[0_2px_20px_rgba(0,0,0,.35)]">Got something to sell?</h2>
          <p className="mt-4 max-w-md text-lg text-white/90">Clear the space. Put money in your pocket. Help someone else too.</p>
          <Link href="/list" className={`${BUTTON} mt-8 min-w-56 bg-bg`}>List an item</Link>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted">© OBN NATION · Connecting People ❤️💚💙</footer>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/90 p-4 backdrop-blur">
        <div className="mx-auto w-full max-w-screen480">
          <Link href="/list" className={`${BUTTON} bg-brand-red`}>List an item</Link>
        </div>
      </div>
    </main>
  );
}
