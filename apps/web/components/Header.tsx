import Image from 'next/image';
import Link from 'next/link';

/** Compact header for working screens: logo, name and tagline. */
export function Header() {
  return (
    <header className="flex items-center gap-3 py-4">
      <Image src="/brand/obn-logo-on-black.jpg" alt="OBN NATION logo" width={48} height={48} priority />
      <div>
        <p className="text-base font-semibold leading-tight">OBN NATION</p>
        <p className="text-sm leading-tight text-muted">Connecting People ❤️💚💙</p>
      </div>
      <Link href="/#about" className="ml-auto flex min-h-12 items-center px-2 text-sm text-tint-blue underline">About</Link>
    </header>
  );
}
