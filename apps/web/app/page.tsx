import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

const ABOUT = [
  'OBN NATION (One Beta Nation) is a Nigerian community-driven decluttering and asset-liquidation marketplace and advertising company. We connect people with products, services, opportunities and trusted transactions by helping individuals and businesses turn unused assets into value.',
  'Through our community networks, advertising channels and associate network, we help sellers reach potential buyers while making quality, affordable items more accessible to our communities. Our model combines community commerce, marketing and trust-focused transaction support.',
  'We believe that trust is an asset, reputation is capital, and integrity is a long-term business strategy. Our mission is to make buying, selling and decluttering easier by connecting people and creating value within our communities.',
];

const STEPS = [
  { n: '1', title: 'Post your item', text: 'Add clear photos, a short video, the price and where you are. It takes a few minutes on your phone.' },
  { n: '2', title: 'We check it', text: 'A real person in your region reviews every listing before anyone sees it. If something is off, we tell you what to fix.' },
  { n: '3', title: 'Get found', text: 'Approved items are shown to buyers in your community, so the right people see what you are selling.' },
];

const VALUES = [
  { title: 'Trust is an asset', text: 'Every listing is checked before it goes out.', border: 'border-tint-red', dot: 'bg-brand-red' },
  { title: 'Reputation is capital', text: 'Honest sellers build a name buyers come back to.', border: 'border-tint-green', dot: 'bg-brand-green' },
  { title: 'Integrity lasts', text: 'We grow by doing right by our communities.', border: 'border-tint-blue', dot: 'bg-brand-blue' },
];

// LP-4: title, description from the first sentence of the About copy, and Open Graph.
export const metadata: Metadata = {
  title: 'OBN NATION — Connecting People',
  description: ABOUT[0].split('. ')[0] + '.',
  openGraph: { title: 'OBN NATION — Connecting People', description: ABOUT[0].split('. ')[0] + '.', type: 'website' },
};

const BLEED = 'relative left-1/2 w-screen -translate-x-1/2';
const INNER = 'mx-auto w-full max-w-5xl px-5';
const BUTTON =
  'flex min-h-12 items-center justify-center rounded-lg px-6 text-base font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

/** Gateway page (PRD 6.1). Fully static: no data calls and no script needed to read it. */
export default function Home() {
  return (
    <main className="pb-24">
      <div className={BLEED}>
        <div className="flex h-1.5 w-full" aria-hidden="true">
          <span className="flex-1 bg-brand-red" />
          <span className="flex-1 bg-brand-green" />
          <span className="flex-1 bg-brand-blue" />
        </div>
      </div>

      {/* Hero */}
      <section className={`${BLEED} bg-[radial-gradient(ellipse_at_top,#1f1f1f_0%,#0a0a0a_70%)]`}>
        <div className={`${INNER} flex flex-col items-center py-12 text-center sm:py-20`}>
          <Image src="/brand/obn-logo-on-black.jpg" alt="OBN NATION logo" width={132} height={132} priority className="rounded-full" />
          <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-tint-green">One Beta Nation</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">Turn what you don’t use into value.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Nigeria’s community marketplace for decluttering. Sell your unused items to people who need them, in a place you can trust.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-md sm:flex-row">
            <Link href="/list" className={`${BUTTON} flex-1 bg-brand-red`}>List an item</Link>
            <a href="#how" className={`${BUTTON} flex-1 border border-border bg-surface`}>How it works</a>
          </div>
          <p className="mt-6 text-muted">Connecting People ❤️💚💙</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" aria-labelledby="how-h" className={`${BLEED} bg-bg`}>
        <div className={`${INNER} py-12 sm:py-16`}>
          <h2 id="how-h" className="text-center text-3xl font-bold">How it works</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-muted">Three simple steps. No stress.</p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-xl border border-border bg-surface p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-red text-lg font-bold" aria-hidden="true">{s.n}</span>
                <h3 className="mt-4 text-xl font-semibold">Step {s.n}: {s.title}</h3>
                <p className="mt-2 text-base text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Values */}
      <section aria-labelledby="values-h" className={`${BLEED} bg-surface`}>
        <div className={`${INNER} py-12 sm:py-16`}>
          <h2 id="values-h" className="text-center text-3xl font-bold">What we stand for</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {VALUES.map((v) => (
              <li key={v.title} className={`rounded-xl border-l-4 ${v.border} bg-bg p-6`}>
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${v.dot}`} aria-hidden="true" />
                <h3 className="mt-3 text-xl font-semibold">{v.title}</h3>
                <p className="mt-1 text-base text-muted">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* About (client copy, word for word) */}
      <section id="about" aria-labelledby="about-h" className={`${BLEED} bg-bg`}>
        <div className={`${INNER} py-12 sm:py-16`}>
          <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-xl border border-border bg-surface p-6 sm:p-8">
            <h2 id="about-h" className="text-2xl font-bold">About OBN NATION</h2>
            {ABOUT.map((p) => (
              <p key={p.slice(0, 20)} className="text-base leading-relaxed">{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className={`${BLEED} bg-surface`}>
        <div className={`${INNER} flex flex-col items-center py-12 text-center`}>
          <h2 className="text-3xl font-bold">Got something to sell?</h2>
          <p className="mt-2 max-w-md text-muted">Clear out the space. Put money in your pocket. Help someone else too.</p>
          <Link href="/list" className={`${BUTTON} mt-6 w-full max-w-sm bg-brand-red`}>List an item</Link>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted">© OBN NATION · Connecting People</footer>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg p-4">
        <div className="mx-auto w-full max-w-screen480">
          <Link href="/list" className={`${BUTTON} bg-brand-red`}>List an item</Link>
        </div>
      </div>
    </main>
  );
}
