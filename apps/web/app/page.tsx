import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

const ABOUT = [
  'OBN NATION (One Beta Nation) is a Nigerian community-driven decluttering and asset-liquidation marketplace and advertising company. We connect people with products, services, opportunities and trusted transactions by helping individuals and businesses turn unused assets into value.',
  'Through our community networks, advertising channels and associate network, we help sellers reach potential buyers while making quality, affordable items more accessible to our communities. Our model combines community commerce, marketing and trust-focused transaction support.',
  'We believe that trust is an asset, reputation is capital, and integrity is a long-term business strategy. Our mission is to make buying, selling and decluttering easier by connecting people and creating value within our communities.',
];

// LP-4: title, description from the first sentence of the About copy, and Open Graph.
export const metadata: Metadata = {
  title: 'OBN NATION — Connecting People',
  description: ABOUT[0].split('. ')[0] + '.',
  openGraph: { title: 'OBN NATION — Connecting People', description: ABOUT[0].split('. ')[0] + '.', type: 'website' },
};

/** Gateway page (PRD 6.1). Fully static: no data calls and no script needed to read it. */
export default function Home() {
  return (
    <main className="pb-28">
      <header className="flex flex-col items-center py-6">
        <Image src="/brand/obn-logo-on-black.jpg" alt="OBN NATION logo" width={160} height={160} priority />
        <h1 className="mt-2 text-center text-2xl font-semibold">OBN NATION</h1>
        <p className="text-center text-muted">Connecting People ❤️💚💙</p>
      </header>

      <section id="about" aria-labelledby="about-h" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <h2 id="about-h" className="text-xl">About OBN NATION</h2>
        {ABOUT.map((p) => (
          <p key={p.slice(0, 20)} className="text-base leading-relaxed">{p}</p>
        ))}
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg p-4">
        <div className="mx-auto w-full max-w-screen480">
          <Link href="/list" className="flex min-h-12 items-center justify-center rounded-lg bg-brand-red px-4 text-base font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            List an item
          </Link>
        </div>
      </div>
    </main>
  );
}
