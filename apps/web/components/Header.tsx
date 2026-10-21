import Image from 'next/image';
import Link from 'next/link';

export const BLEED = 'relative left-1/2 w-screen -translate-x-1/2';

/** Top bar for every screen except the home page: tricolour strip, logo, name, two links. Light and warm. */
export function Header() {
  return (
    <header className="sticky top-0 z-30 ml-[calc(50%-50vw)] w-screen border-b border-[#E7E0D4] bg-[#FAF7F2]/90 text-[#16140F] backdrop-blur-md">
      <div className="flex h-1" aria-hidden="true">
        <span className="flex-1 bg-brand-red" />
        <span className="flex-1 bg-brand-green" />
        <span className="flex-1 bg-brand-blue" />
      </div>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <Link href="/" className="flex min-h-12 items-center gap-3" aria-label="OBN NATION home">
          <Image src="/brand/obn-logo-clear.webp" alt="" width={44} height={44} priority className="h-11 w-11 rounded-full bg-[#0A0A0A] p-0.5" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-extrabold tracking-tight">OBN NATION</span>
            <span className="text-xs text-[#6B655A]">Connecting People</span>
          </span>
        </Link>
        <nav aria-label="Site" className="ml-auto flex items-center gap-1 text-sm font-semibold">
          <Link href="/" className="flex min-h-12 items-center rounded-full px-4 text-[#16140F]/75 transition-colors hover:bg-[#16140F] hover:text-white">Home</Link>
          <Link href="/#about" className="flex min-h-12 items-center rounded-full px-4 text-[#16140F]/75 transition-colors hover:bg-[#16140F] hover:text-white">About</Link>
        </nav>
      </div>
    </header>
  );
}
