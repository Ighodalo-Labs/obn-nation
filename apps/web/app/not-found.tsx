import Link from 'next/link';
import { Header } from '@/components/Header';

export default function NotFound() {
  return (
    <main>
      <Header />
      <div className="flex flex-col items-start gap-4 py-8">
        <h1 className="text-2xl">Page not found</h1>
        <p className="text-base text-muted">We could not find that page.</p>
        <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/25 disabled:hover:bg-transparent">Go to the home page</Link>
      </div>
    </main>
  );
}
