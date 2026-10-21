import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export default function NotFound() {
  return (
    <main className="ml-[calc(50%-50vw)] min-h-screen w-screen bg-[#FAF7F2] text-[#16140F]">
      <style>{'html,body{background:#FAF7F2 !important;color:#16140F}'}</style>
      <Header />
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-20 sm:py-28">
        <span className="flex h-1.5 w-20 overflow-hidden rounded-full" aria-hidden="true"><i className="flex-1 bg-brand-red" /><i className="flex-1 bg-brand-green" /><i className="flex-1 bg-brand-blue" /></span>
        <h1 className="font-display text-[clamp(2.6rem,8vw,5.5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">Page not found.</h1>
        <p className="max-w-md text-lg text-[#6B655A]">We could not find that page. It may have moved, or the link may be old.</p>
        <Link href="/" className="inline-flex min-h-14 items-center justify-center rounded-full bg-brand-red px-7 text-base font-bold text-white transition-all hover:bg-[#16140F] active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16140F]">Go to the home page</Link>
      </div>
      <Footer />
    </main>
  );
}
