import Image from 'next/image';
import Link from 'next/link';

export const BLEED = 'relative left-1/2 w-screen -translate-x-1/2';

/** Top bar for every screen except the home page: tricolour strip, logo, name, two links. */
export function Header() {
  return (
    <header className={`ml-[calc(50%-50vw)] w-screen sticky top-0 z-30 border-b border-white/10 bg-bg/85 backdrop-blur-md`}>
      <div className="flex h-1" aria-hidden="true">
        <span className="flex-1 bg-brand-red" />
        <span className="flex-1 bg-brand-green" />
        <span className="flex-1 bg-brand-blue" />
      </div>
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex min-h-12 items-center gap-3" aria-label="OBN NATION home">
          <Image src="/brand/obn-logo-clear.webp" alt="" width={44} height={44} priority className="h-11 w-11" />
          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-wide">OBN NATION</span>
            <span className="text-xs text-muted">Connecting People</span>
          </span>
        </Link>
        <nav aria-label="Site" className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/" className="flex min-h-12 items-center rounded-full px-3 text-white/80 hover:bg-white/10 hover:text-white">Home</Link>
          <Link href="/#about" className="flex min-h-12 items-center rounded-full px-3 text-white/80 hover:bg-white/10 hover:text-white">About</Link>
        </nav>
      </div>
    </header>
  );
}
