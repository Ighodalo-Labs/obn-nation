import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { LandingMotion } from '@/components/landing/LandingMotion';
import { ListingCard } from '@/components/landing/ListingCard';
import { BadgeCheck, Camera, CookingPot, Laptop, Lock, MapPin, Package, Refrigerator, ShieldCheck, Smartphone, Sofa, Tv, Zap } from 'lucide-react';


const ABOUT = [
  'OBN NATION (One Beta Nation) is a Nigerian community-driven decluttering and asset-liquidation marketplace and advertising company. We connect people with products, services, opportunities and trusted transactions by helping individuals and businesses turn unused assets into value.',
  'Through our community networks, advertising channels and associate network, we help sellers reach potential buyers while making quality, affordable items more accessible to our communities. Our model combines community commerce, marketing and trust-focused transaction support.',
  'We believe that trust is an asset, reputation is capital, and integrity is a long-term business strategy. Our mission is to make buying, selling and decluttering easier by connecting people and creating value within our communities.',
];

const STEPS = [
  { n: '1', color: 'bg-brand-red', title: 'Add your item', text: 'Take clear photos, record a short video and set your price. It all happens on your phone.' },
  { n: '2', color: 'bg-brand-blue', title: 'An admin checks it', text: 'Someone in your region reviews it. If it is not right, you get the reason and a link to fix it.' },
  { n: '3', color: 'bg-brand-green', title: 'It goes live', text: 'Approved items join the regional pool, ready for buyers in your community.' },
];

const CATEGORIES = [
  { label: 'Phones', hint: 'Phones and tablets', Icon: Smartphone },
  { label: 'Computers', hint: 'Laptops and desktops', Icon: Laptop },
  { label: 'TVs', hint: 'Any size', Icon: Tv },
  { label: 'Fridges', hint: 'Fridges and freezers', Icon: Refrigerator },
  { label: 'Generators', hint: 'Power at home or work', Icon: Zap },
  { label: 'Kitchen', hint: 'Cookers and appliances', Icon: CookingPot },
  { label: 'Furniture', hint: 'Beds, sofas, tables', Icon: Sofa },
  { label: 'Other', hint: 'Anything in good order', Icon: Package },
];

const PROOF = [
  { Icon: ShieldCheck, title: 'Every listing is checked', text: 'A real admin reviews it before it goes live.' },
  { Icon: Lock, title: 'Your number stays private', text: 'Buyers never see your name or phone.' },
  { Icon: MapPin, title: 'Sold close to home', text: 'Port Harcourt, Delta and Ekiti first.' },
];

const TRUST = [
  { Icon: BadgeCheck, title: 'Checked before it shows', text: 'An admin in your region reviews every listing before any buyer sees it.', bar: 'bg-brand-red' },
  { Icon: Camera, title: 'Clear reasons, easy fixes', text: 'If a listing is turned down, you get the reason and a link to fix it and send it again.', bar: 'bg-brand-green' },
  { Icon: ShieldCheck, title: 'Bad sellers are blocked', text: 'Admins can block a seller for good. Honest sellers keep the marketplace worth using.', bar: 'bg-brand-blue' },
];

const VALUES = [
  { title: 'Trust is an asset', bar: 'bg-brand-red' },
  { title: 'Reputation is capital', bar: 'bg-brand-green' },
  { title: 'Integrity is strategy', bar: 'bg-brand-blue' },
];

const FAQ = [
  { q: 'How do I sign in?', a: 'Enter your phone number. We send you a code on WhatsApp. No password to remember.' },
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

const FULL = 'relative left-1/2 w-screen -translate-x-1/2';
const BLEED = '';
const INNER = 'mx-auto w-full max-w-6xl px-5';
const BTN = 'flex min-h-12 items-center justify-center rounded-full px-7 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const H2 = 'text-3xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-5xl';
const NAVLINK = 'flex min-h-12 items-center rounded-full px-4 text-sm font-medium text-[#0A0A0A]/75 transition-colors hover:bg-black/5 hover:text-[#0A0A0A]';

/** Gateway page (PRD 6.1). Server-rendered and complete without scripts. Motion is added on top. */
export default function Home() {
  return (
    <main className={`${FULL} bg-[#F6F6F4] pb-24 text-[#0A0A0A] md:pb-0`}>
      <style>{`html,body{background:#F6F6F4 !important;color:#0A0A0A}`}</style>
      <script
        dangerouslySetInnerHTML={{
          __html: "try{if(sessionStorage.getItem('obn-intro')){document.documentElement.classList.add('no-intro')}else{sessionStorage.setItem('obn-intro','1')}}catch(e){}",
        }}
      />
      <LandingMotion />

      {/* Opening: logo, a red, green and blue line, then the screen lifts away. Once per visit. */}
      <div className="intro" aria-hidden="true">
        <Image src="/brand/obn-logo-clear.webp" alt="" width={720} height={720} priority className="logo h-[min(50vw,240px)] w-[min(50vw,240px)]" />
        <div className="bar"><span /><span /><span /></div>
      </div>

      {/* Top bar */}
      <header className={`${BLEED} sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-md`}>
        <div className="flex h-1" aria-hidden="true">
          <span className="flex-1 bg-brand-red" /><span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-blue" />
        </div>
        <div className={`${INNER} flex items-center gap-2 py-2`}>
          <Link href="/" className="flex min-h-12 items-center gap-3" aria-label="OBN NATION home">
            <Image src="/brand/obn-logo-clear.webp" alt="" width={48} height={48} priority className="h-11 w-11 rounded-full bg-[#0A0A0A] p-0.5" />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-wide">OBN NATION</span>
              <span className="hidden text-xs text-[#5C5C58] sm:block">Connecting People</span>
            </span>
          </Link>
          <nav aria-label="Site" className="ml-auto hidden items-center md:flex">
            <a href="#how" className={NAVLINK}>How it works</a>
            <a href="#safety" className={NAVLINK}>Safety</a>
            <a href="#faq" className={NAVLINK}>FAQ</a>
            <a href="#about" className={NAVLINK}>About</a>
          </nav>
          <Link href="/list" className={`${BTN} ml-auto bg-brand-red px-5 text-sm text-white hover:bg-[#B71C1C] focus-visible:outline-[#0A0A0A] md:ml-3 md:px-6 md:text-base`}>
            List an item
          </Link>
        </div>
      </header>

      {/* Hero: full photo, one clear message, one clear action */}
      <section className={`${BLEED} relative isolate overflow-hidden bg-[#0A0A0A]`}>
        <Image src="/photos/living-room.webp" alt="" fill priority sizes="100vw" className="settle -z-20 object-cover object-[70%_50%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0A0A0A]/75 via-[#0A0A0A]/35 to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0A0A0A]/40 via-transparent to-transparent" aria-hidden="true" />
        <div className={`${INNER} flex min-h-[600px] flex-col justify-center pb-28 pt-20 lg:min-h-[680px]`}>
          <p className="hero-fade mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur" style={{ ['--d' as string]: '.1s' }}>
            <MapPin size={16} aria-hidden="true" /> Now in Port Harcourt, Delta and Ekiti
          </p>
          <h1 className="max-w-4xl text-[clamp(2.5rem,5.8vw,4.9rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            <span className="line-mask"><span style={{ ['--d' as string]: '.1s' }}>Someone near you</span></span>
            <span className="line-mask"><span style={{ ['--d' as string]: '.22s' }}>needs what you don’t.</span></span>
          </h1>
          <p className="hero-fade mt-6 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl" style={{ ['--d' as string]: '.5s' }}>
            List an item in minutes. An admin checks it. Then it is ready for buyers in your community.
          </p>
          <div className="hero-fade mt-9 flex flex-col gap-3 sm:flex-row" style={{ ['--d' as string]: '.65s' }}>
            <Link href="/list" className={`${BTN} bg-brand-red text-white hover:bg-[#B71C1C] focus-visible:outline-white`}>List an item</Link>
            <a href="#how" className={`${BTN} border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20 focus-visible:outline-white`}>See how it works</a>
          </div>
        </div>
      </section>

      {/* Proof strip overlapping the hero */}
      <section className={`${INNER} relative z-10 -mt-14`}>
        <ul className="grid gap-px overflow-hidden rounded-2xl bg-black/10 shadow-[0_24px_60px_-20px_rgba(0,0,0,.35)] sm:grid-cols-3" data-reveal>
          {PROOF.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4 bg-white p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-white"><Icon size={22} aria-hidden="true" /></span>
              <span><b className="block text-base font-semibold">{title}</b><span className="text-sm text-[#5C5C58]">{text}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {/* What you can list */}
      <section className={`${INNER} py-20 sm:py-28`} aria-labelledby="list-h">
        <div className="max-w-2xl" data-reveal>
          <h2 id="list-h" className={H2}>What you can list</h2>
          <p className="mt-4 text-lg text-[#5C5C58]">Everyday items that still have life in them.</p>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {CATEGORIES.map(({ label, hint, Icon }, i) => (
            <li key={label} data-reveal>
              <Link href="/list" className="group flex h-full flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 transition-all hover:-translate-y-1 hover:border-black/25 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0A0A0A]">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${['bg-brand-red', 'bg-brand-green', 'bg-brand-blue'][i % 3]}`}><Icon size={24} aria-hidden="true" /></span>
                <span><b className="block text-lg font-semibold">{label}</b><span className="text-sm text-[#5C5C58]">{hint}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how" className={`${BLEED} bg-white`} aria-labelledby="how-h">
        <div className={`${INNER} grid items-center gap-14 py-20 sm:py-28 lg:grid-cols-[1.1fr_.9fr]`}>
          <div>
            <h2 id="how-h" className={H2} data-reveal>Three steps. No shop to set up.</h2>
            <ol className="mt-10 flex flex-col gap-8">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-5" data-reveal>
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white ${s.color}`}>{s.n}</span>
                  <span><b className="block text-xl font-semibold">{s.title}</b><span className="mt-1 block max-w-md text-base text-[#5C5C58]">{s.text}</span></span>
                </li>
              ))}
            </ol>
            <Link href="/list" className={`${BTN} mt-10 w-fit bg-[#0A0A0A] text-white hover:bg-black/80 focus-visible:outline-[#0A0A0A]`}>Start your listing</Link>
          </div>
          <div className="flex justify-center" data-reveal>
            <ListingCard mode="auto" className="w-full max-w-[22rem]" />
          </div>
        </div>
      </section>

      {/* Safety */}
      <section id="safety" className={`${BLEED} bg-[#0A0A0A] text-white`} aria-labelledby="safe-h">
        <div className={`${INNER} py-20 sm:py-28`}>
          <h2 id="safe-h" className={`${H2} max-w-3xl`} data-reveal>A real person checks every listing.</h2>
          <ul className="mt-12 grid gap-4 md:grid-cols-3">
            {TRUST.map(({ Icon, title, text, bar }) => (
              <li key={title} className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717]" data-reveal>
                <span className={`block h-1 ${bar}`} aria-hidden="true" />
                <div className="p-6">
                  <Icon size={28} className="text-white" aria-hidden="true" />
                  <h3 className="mt-5 text-xl font-semibold">{title}</h3>
                  <p className="mt-2 text-base text-white/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={`${INNER} grid gap-12 py-20 sm:py-28 lg:grid-cols-[.8fr_1.2fr]`} aria-labelledby="faq-h">
        <h2 id="faq-h" className={H2} data-reveal>Questions, answered.</h2>
        <div className="divide-y divide-black/10 border-y border-black/10" data-reveal>
          {FAQ.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex min-h-12 items-center justify-between gap-6 text-lg font-semibold">
                {f.q}
                <span className="plus flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/15 text-xl transition-transform" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 max-w-xl text-base text-[#5C5C58]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* About (PRD 3, client copy word for word) */}
      <section id="about" className={`${BLEED} bg-white`} aria-labelledby="about-h">
        <div className={`${INNER} grid gap-12 py-20 sm:py-28 lg:grid-cols-[.8fr_1.2fr]`}>
          <div data-reveal>
            <h2 id="about-h" className={H2}>About OBN NATION</h2>
            <ul className="mt-8 flex flex-col gap-3">
              {VALUES.map((v) => (
                <li key={v.title} className="flex items-center gap-3 text-lg font-semibold">
                  <span className={`h-6 w-1.5 rounded-full ${v.bar}`} aria-hidden="true" />{v.title}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-5 text-lg leading-relaxed text-[#2B2B28]" data-reveal>
            {ABOUT.map((p) => <p key={p}>{p}</p>)}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className={`${BLEED} relative isolate overflow-hidden bg-[#0A0A0A]`}>
        <Image src="/photos/kitchen.webp" alt="" fill sizes="100vw" className="-z-20 object-cover" />
        <div className="absolute inset-0 -z-10 bg-[#0A0A0A]/70" aria-hidden="true" />
        <div className={`${INNER} flex flex-col items-center py-24 text-center sm:py-32`}>
          <h2 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-6xl" data-reveal>Got something to sell?</h2>
          <Link href="/list" className={`${BTN} mt-9 bg-brand-red text-white hover:bg-[#B71C1C] focus-visible:outline-white`}>List an item</Link>
        </div>
      </section>

      <footer className={`${BLEED} bg-[#0A0A0A] text-white/70`}>
        <div className={`${INNER} flex flex-col items-center gap-4 py-10 text-center text-sm sm:flex-row sm:justify-between sm:text-left`}>
          <div className="flex items-center gap-4">
            <Image src="/brand/obn-logo-clear.webp" alt="OBN NATION" width={80} height={80} className="h-16 w-16" />
            <p>OBN NATION Online. Connecting People.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap justify-center">
            <a href="#how" className="flex min-h-12 items-center px-3 hover:text-white">How it works</a>
            <a href="#faq" className="flex min-h-12 items-center px-3 hover:text-white">FAQ</a>
            <a href="#about" className="flex min-h-12 items-center px-3 hover:text-white">About</a>
          </nav>
        </div>
      </footer>

      {/* Phone only: the top bar already carries the button on larger screens (LP-1) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:hidden">
        <Link href="/list" className={`${BTN} w-full bg-brand-red text-white focus-visible:outline-[#0A0A0A]`}>List an item</Link>
      </div>
    </main>
  );
}
