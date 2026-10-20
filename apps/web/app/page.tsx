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

const CATEGORIES = ['Appliances', 'Furniture', 'Phones and tablets', 'TVs and audio', 'Fans and cooling', 'Kitchen', 'Generators'];

const SHOTS = [
  { src: '/photos/tv-wall.webp', label: 'TVs and audio', w: 1300, h: 1625, offset: 'lg:mt-0' },
  { src: '/photos/devices.webp', label: 'Phones and tablets', w: 1400, h: 933, offset: 'lg:mt-24' },
  { src: '/photos/fan.webp', label: 'Fans and cooling', w: 1400, h: 933, offset: 'lg:mt-10' },
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
  'flex min-h-12 items-center justify-center rounded-full px-7 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141414]';

function Ribbon({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="overflow-hidden" aria-hidden={reverse ? 'true' : undefined}>
      <div className={`marquee-track ${reverse ? 'reverse' : ''}`}>
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 ? 'true' : undefined}>
            {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
              <li key={`${c}-${i}`} className={`px-6 text-[clamp(2.4rem,6vw,4.5rem)] font-semibold tracking-[-0.03em] ${reverse ? 'text-[#141414]/15' : 'text-[#141414]'}`}>
                {c}<span className="ml-12 text-brand-red" aria-hidden="true">•</span>
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
    <main className="bg-[#F7F6F3] pb-24 text-[#141414]">
      <style>{`html,body{background:#F7F6F3 !important;color:#141414}`}</style>
      <LandingMotion />

      {/* Top bar and hero */}
      <section className={`${BLEED}`}>
        <div className="flex h-1 w-full" aria-hidden="true">
          <span className="flex-1 bg-brand-red" /><span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-blue" />
        </div>
        <div className={`${INNER} flex items-center justify-between py-4`}>
          <div className="flex items-center gap-3">
            <Image src="/brand/obn-logo-on-black.jpg" alt="OBN NATION" width={44} height={44} priority className="rounded-full" />
            <span className="text-lg font-semibold tracking-tight">OBN NATION</span>
          </div>
          <nav aria-label="Main" className="flex items-center gap-6 text-sm font-medium">
            <a href="#about" className="hidden min-h-12 items-center sm:flex">About</a>
            <Link href="/list" className="flex min-h-12 items-center rounded-full bg-[#141414] px-5 text-white">List an item</Link>
          </nav>
        </div>

        <div className={`${INNER} grid items-center gap-10 pb-12 pt-4 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:pb-24 lg:pt-10`}>
          <div>
            <h1 className="text-[clamp(2.8rem,6.6vw,5.4rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
              <span className="line-mask"><span style={{ ['--d' as string]: '.1s' }}>Sell what</span></span>
              <span className="line-mask"><span style={{ ['--d' as string]: '.25s' }}>you don’t use.</span></span>
            </h1>
            <p className="hero-fade mt-6 max-w-md text-lg leading-relaxed text-[#55544F]" style={{ ['--d' as string]: '.7s' }}>
              OBN NATION is where Nigerians clear out and cash in. List an item in minutes, get it checked, and reach buyers in your community.
            </p>
            <div className="hero-fade mt-8 flex flex-col gap-3 sm:flex-row" style={{ ['--d' as string]: '.9s' }}>
              <Link href="/list" className={`${BUTTON} bg-brand-red text-white hover:bg-[#B71C1C] sm:min-w-44`}>List an item</Link>
              <a href="#story" className={`${BUTTON} border border-[#141414]/20 hover:bg-[#141414]/5 sm:min-w-44`}>See how it works</a>
            </div>
          </div>

          <div className="hero-fade relative" style={{ ['--d' as string]: '.4s' }}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl sm:aspect-[5/6]">
              <Image src="/photos/living-room.webp" alt="A bright living room with a sofa and a wall-mounted TV" fill priority sizes="(min-width:1024px) 540px, 100vw" className="settle object-cover object-[70%_50%]" />
            </div>
            <div className="hero-fade absolute -bottom-6 left-4 right-4 sm:left-auto sm:right-[-1.5rem] sm:w-[20rem]" style={{ ['--d' as string]: '1.2s' }}>
              <ListingCard mode="auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Category ribbons */}
      <section aria-label="What people sell" className={`${BLEED} flex flex-col gap-1 border-y border-[#E4E2DD] py-8 lg:mt-8`}>
        <Ribbon />
        <Ribbon reverse />
      </section>

      {/* Photos */}
      <section aria-labelledby="home-h" className={`${BLEED}`}>
        <div className={`${INNER} py-16 lg:py-28`}>
          <h2 id="home-h" data-lines className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl">
            <span className="mask"><span data-line className="block">Good things in your home</span></span>
            <span className="mask"><span data-line className="block">deserve a second owner.</span></span>
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-3 lg:items-start">
            {SHOTS.map((s) => (
              <figure key={s.label} className={s.offset}>
                <div data-photo className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[#E4E2DD]">
                  <Image data-photo-img src={s.src} alt="" fill sizes="(min-width:1024px) 360px, 100vw" className="scale-[1.15] object-cover" />
                </div>
                <figcaption className="mt-3 text-lg font-medium">{s.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* How it works: the card follows the step you are reading */}
      <section id="story" aria-labelledby="story-h" className={`${BLEED} bg-white`}>
        <div className={`${INNER} py-16 lg:py-28`}>
          <h2 id="story-h" data-lines className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl">
            <span className="mask"><span data-line className="block">From your room</span></span>
            <span className="mask"><span data-line className="block">to your region.</span></span>
          </h2>
          <div className="mt-8 grid gap-6 lg:mt-14 lg:grid-cols-2 lg:gap-16">
            <div className="sticky top-0 z-10 -mx-5 bg-white/95 px-5 pb-3 pt-3 backdrop-blur lg:static lg:order-2 lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
              <div className="lg:sticky lg:top-24 lg:flex lg:justify-center">
                <ListingCard mode="stage" stage={0} className="w-full max-w-[22rem]" />
              </div>
            </div>
            <ol className="lg:order-1">
              {STEPS.map((s, i) => (
                <li key={s.title} data-step={i} className="flex min-h-[40vh] flex-col justify-center opacity-35 transition-opacity duration-500 data-[active]:opacity-100 lg:min-h-[64vh]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#141414]/25 text-base font-semibold" aria-hidden="true">{i + 1}</span>
                  <h3 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{s.title}</h3>
                  <p className="mt-3 max-w-md text-lg leading-relaxed text-[#55544F]">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Values and About */}
      <section aria-labelledby="values-h" className={`${BLEED}`}>
        <div className={`${INNER} py-16 lg:py-28`}>
          <h2 id="values-h" data-lines className="text-[clamp(2.3rem,6vw,4.8rem)] font-semibold leading-[1.05] tracking-[-0.04em]">
            <span className="mask"><span data-line className="block">Trust is an asset.</span></span>
            <span className="mask"><span data-line className="block text-[#141414]/50">Reputation is capital.</span></span>
            <span className="mask"><span data-line className="block text-[#141414]/25">Integrity lasts.</span></span>
          </h2>
          <div id="about" className="mt-14 grid gap-8 border-t border-[#E4E2DD] pt-10 lg:grid-cols-[.7fr_1.3fr]">
            <h3 className="text-2xl font-semibold">About OBN NATION</h3>
            <div className="flex flex-col gap-4">
              {ABOUT.map((p) => (
                <p key={p.slice(0, 20)} className="max-w-prose text-base leading-relaxed text-[#33322F]">{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Closing call to action over a real photo */}
      <section className={`${BLEED} overflow-hidden`}>
        <div data-photo className="relative">
          <div className="absolute inset-0">
            <Image data-photo-img src="/photos/living-room.webp" alt="" fill sizes="100vw" className="scale-[1.15] object-cover" />
            <div className="absolute inset-0 bg-[#141414]/60" />
          </div>
          <div className={`${INNER} relative flex flex-col items-center py-24 text-center text-white lg:py-36`}>
            <h2 className="text-[clamp(2.4rem,6.5vw,5rem)] font-semibold leading-[1.03] tracking-[-0.04em]">Got something to sell?</h2>
            <p className="mt-4 max-w-md text-lg text-white/85">Clear the space. Put money in your pocket. Help someone else too.</p>
            <Link href="/list" className={`${BUTTON} mt-8 min-w-56 bg-brand-red text-white hover:bg-[#B71C1C] focus-visible:outline-white`}>List an item</Link>
          </div>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-sm text-[#6B6A66]">
        <p>© OBN NATION · Connecting People ❤️💚💙</p>
        <p className="mt-1">Photos from Unsplash. See the credits in the project files.</p>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#E4E2DD] bg-[#F7F6F3]/90 p-4 backdrop-blur">
        <div className="mx-auto w-full max-w-screen480">
          <Link href="/list" className={`${BUTTON} bg-brand-red text-white hover:bg-[#B71C1C]`}>List an item</Link>
        </div>
      </div>
    </main>
  );
}
