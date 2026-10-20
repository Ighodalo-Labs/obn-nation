import Image from 'next/image';

/** T01 placeholder. The full gateway page and About Us card arrive in T16. */
export default function Home() {
  return (
    <main>
      <header className="flex flex-col items-center py-6">
        <Image src="/brand/obn-logo-on-black.jpg" alt="OBN NATION logo" width={160} height={160} priority />
        <p className="mt-2 text-center text-lg font-semibold">OBN NATION</p>
        <p className="text-center text-muted">Connecting People ❤️💚💙</p>
      </header>
    </main>
  );
}
