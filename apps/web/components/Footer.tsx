import Image from 'next/image';
import Link from 'next/link';
import { BLEED } from './Header';

export function Footer() {
  return (
    <footer className={`${BLEED} mt-12 border-t border-white/10 bg-[#0A0A0A]`}>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-8 text-center text-sm text-muted sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          <Image src="/brand/obn-logo-clear.webp" alt="" width={40} height={40} className="h-10 w-10" />
          <p>OBN NATION Online. Connecting People.</p>
        </div>
        <nav aria-label="Footer" className="flex gap-1">
          <Link href="/" className="flex min-h-12 items-center px-3 hover:text-white">Home</Link>
          <Link href="/#faq" className="flex min-h-12 items-center px-3 hover:text-white">FAQ</Link>
          <Link href="/#about" className="flex min-h-12 items-center px-3 hover:text-white">About</Link>
        </nav>
      </div>
    </footer>
  );
}
