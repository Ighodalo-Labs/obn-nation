import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { LandingMotion } from '@/components/landing/LandingMotion';
import { ListingCard } from '@/components/landing/ListingCard';
import { ArrowUpRight, BadgeCheck, Camera, Lock, MapPin, ShieldCheck } from 'lucide-react';


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

const TILES = [
  { label: 'Phones', src: '/photos/devices.webp', alt: 'A phone, tablet and laptop on a wooden table', span: 'sm:row-span-2', pos: 'object-[30%_50%]' },
  { label: 'TVs', src: '/photos/tv-wall.webp', alt: 'A TV on the wall of a tidy living room', span: 'sm:col-span-2', pos: 'object-[50%_42%]' },
  { label: 'Computers', src: '/photos/devices.webp', alt: 'A laptop and tablet on a desk', span: '', pos: 'object-[10%_95%]' },
  { label: 'Fridges and kitchen', src: '/photos/kitchen.webp', alt: 'A kitchen with a washing machine and fridge', span: '', pos: 'object-center' },
  { label: 'Furniture', src: '/photos/living-room.webp', alt: 'A sofa and coffee table in a living room', span: 'sm:col-span-2', pos: 'object-[80%_70%]' },
];
const MORE = ['Generators', 'Other'];

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

const FULL = 'ml-[calc(50%-50vw)] w-screen';
const BLEED = '';
const INNER = 'mx-auto w-full max-w-6xl px-5';
const BTN = 'flex min-h-12 items-center justify-center rounded-full px-7 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
const H2 = 'font-display text-3xl font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-5xl';
const NAVLINK = 'flex min-h-12 items-center rounded-full px-4 text-sm font-medium text-[#0A0A0A]/75 transition-colors hover:bg-black/5 hover:text-[#0A0A0A]';

/** Gateway page (PRD 6.1). Server-rendered and complete without scripts. Motion is added on top. */
export default function Home() {
  return (
    <main className={`${FULL} bg-[#F6F6F4] pb-24 text-[#0A0A0A] md:pb-0`}>
      <style>{`html,body{background:#F6F6F4 !important;color:#0A0A0A}`}</style>
      <LandingMotion />

      {/* Opening: logo, a red, green and blue line, then the screen lifts away. Once per visit. */}
      <div className="intro" aria-hidden="true">
        <div className="intro-bg" />
        <div className="rev rev-1" /><div className="rev rev-2" /><div className="rev rev-3" /><div className="rev rev-4" />
        <div className="intro-items">
          {['/photos/devices.webp', '/photos/living-room.webp', '/photos/tv-wall.webp', '/photos/kitchen.webp', '/photos/fan.webp'].map((src) => (
            <div key={src} className="intro-item"><Image src={src} alt="" width={300} height={300} priority /></div>
          ))}
        </div>
        <div className="intro-logo"><Image src="/brand/obn-logo-clear.webp" alt="" width={520} height={520} priority /></div>
      </div>

      {/* Top bar */}
      <header className={`${BLEED} sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur-md`}>
        <div className="flex h-1" aria-hidden="true">
          <span className="flex-1 bg-brand-red" /><span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-blue" />
        </div>
        <div className={`${INNER} flex items-center gap-2 py-2`}>
          <Link href="/" className="flex min-h-12 items-center gap-3" aria-label="OBN NATION home">
            <Image id="nav-logo" src="/brand/obn-logo-clear.webp" alt="" width={48} height={48} priority className="h-11 w-11 rounded-full bg-[#0A0A0A] p-0.5" />
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
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0A0A0A]/80 via-[#0A0A0A]/40 to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0A0A0A]/50 via-transparent to-transparent" aria-hidden="true" />
        <div className={`${INNER} flex min-h-[620px] flex-col justify-center pb-28 pt-16 lg:min-h-[700px]`}>
          <p className="hero-fade mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur" style={{ ['--d' as string]: '.1s' }}>
            <MapPin size={16} aria-hidden="true" /> Now in Port Harcourt, Delta and Ekiti
          </p>
          <h1 className="font-display max-w-4xl text-[clamp(2.6rem,6vw,5.2rem)] font-extrabold leading-[1.0] tracking-[-0.04em] text-white">
            <span className="line-mask"><span style={{ ['--d' as string]: '.1s' }}>Someone near you</span></span>
            <span className="line-mask"><span style={{ ['--d' as string]: '.22s' }}>needs what you don’t.</span></span>
          </h1>
          <p className="hero-fade mt-6 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl" style={{ ['--d' as string]: '.5s' }}>
            List an item in minutes. An admin checks it. Then it is ready for buyers in your community.
          </p>
          <div className="hero-fade mt-9 flex flex-col gap-3 sm:flex-row" style={{ ['--d' as string]: '.65s' }}>
            <Link href="/list" className={`${BTN} gap-2 bg-brand-red text-white hover:bg-[#B71C1C] focus-visible:outline-white`}>List an item <ArrowUpRight size={18} aria-hidden="true" /></Link>
            <a href="#how" className={`${BTN} border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20 focus-visible:outline-white`}>See how it works</a>
          </div>
        </div>
      </section>

      {/* Proof strip overlapping the hero */}
      <section className={`${INNER} relative z-10 -mt-16`}>
        <ul className="grid gap-px overflow-hidden rounded-2xl bg-black/10 shadow-[0_24px_60px_-20px_rgba(0,0,0,.35)] sm:grid-cols-3" data-reveal>
          {PROOF.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4 bg-white p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A0A0A] text-white"><Icon size={22} aria-hidden="true" /></span>
              <span><b className="block text-base font-semibold">{title}</b><span className="text-sm text-[#5C5C58]">{text}</span></span>
            </li>
          ))}
        </ul>
      </section>

      {/* What you can list: photo grid */}
      <section className={`${INNER} py-14 sm:py-20`} aria-labelledby="list-h">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end" data-reveal>
          <div className="max-w-2xl">
            <h2 id="list-h" className={H2}>What you can list</h2>
            <p className="mt-4 text-lg text-[#5C5C58]">Everyday items that still have life in them.</p>
          </div>
          <Link href="/list" className="flex min-h-11 w-fit items-center gap-2 rounded-full border border-black/20 px-5 text-sm font-semibold transition-colors hover:border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white">Start listing <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
        <ul className="mt-10 grid auto-rows-[200px] grid-cols-2 gap-3 sm:auto-rows-[220px] sm:grid-cols-4 sm:gap-4">
          {TILES.map((t) => (
            <li key={t.label} className={`${t.span} col-span-1`} data-reveal>
              <Link href="/list" className="photo-card group relative block cursor-pointer h-full w-full overflow-hidden rounded-3xl bg-[#0A0A0A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0A0A0A]">
                <Image src={t.src} alt={t.alt} fill sizes="(min-width:640px) 25vw, 50vw" className={`object-cover ${t.pos}`} />
                <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" aria-hidden="true" />
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#0A0A0A]"><ShieldCheck size={14} className="text-brand-green" aria-hidden="true" />Admin checked</span>
                <span className="absolute inset-x-5 bottom-4 flex items-center justify-between text-white">
                  <b className="text-lg font-semibold sm:text-xl">{t.label}</b>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-colors group-hover:bg-brand-red"><ArrowUpRight size={18} aria-hidden="true" /></span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <ul className="mt-4 flex flex-wrap gap-3" data-reveal>
          {MORE.map((m, i) => (
            <li key={m}>
              <Link href="/list" className={`flex min-h-12 items-center rounded-full px-6 text-base font-semibold text-white ${i === 0 ? 'bg-brand-green' : 'bg-brand-blue'}`}>{m}</Link>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how" className={`${BLEED} bg-[#ECE6DC]`} aria-labelledby="how-h">
        <div className={`${INNER} grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_.9fr]`}>
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
          <div className="relative mx-auto w-full max-w-md pb-16" data-reveal>
            <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
              <Image src="/photos/tv-wall.webp" alt="A TV on a wall in a tidy living room" fill sizes="(min-width:1024px) 420px, 90vw" className="object-cover object-[50%_40%]" />
            </div>
            <ListingCard mode="auto" className="absolute -bottom-0 -left-4 w-[78%] sm:-left-10" />
          </div>
        </div>
      </section>

      {/* Safety */}
      <section id="safety" className={`${BLEED} bg-[#0A0A0A] text-white`} aria-labelledby="safe-h">
        <div className={`${INNER} py-14 sm:py-20`}>
          <h2 id="safe-h" className={`${H2} max-w-3xl`} data-reveal>A real person checks every listing.</h2>
          <ul className="mt-9 grid gap-4 md:grid-cols-3">
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
      <section id="faq" className={`${BLEED} bg-[#F6F6F4]`} aria-labelledby="faq-h"><div className={`${INNER} grid gap-10 py-14 sm:py-20 lg:grid-cols-[.8fr_1.2fr]`}>
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
        </div>
      </section>

      {/* About (PRD 3, client copy word for word) */}
      <section id="about" className={`${BLEED} bg-[#ECE6DC]`} aria-labelledby="about-h">
        <div className={`${INNER} grid gap-12 py-14 sm:py-20 lg:grid-cols-[.8fr_1.2fr]`}>
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
        <Image src="/photos/kitchen.webp" alt="" fill sizes="100vw" className="-z-20 object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-[#0A0A0A]/65" aria-hidden="true" />
        <div className={`${INNER} flex flex-col items-center py-16 text-center sm:py-24`}>
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
