import Link from 'next/link';
import { Header } from '@/components/Header';

export default function NotFound() {
  return (
    <main>
      <Header />
      <div className="flex flex-col items-start gap-4 py-8">
        <h1 className="text-2xl">Page not found</h1>
        <p className="text-base text-muted">We could not find that page.</p>
        <Link href="/" className="flex min-h-12 items-center text-tint-blue underline">Go to the home page</Link>
      </div>
    </main>
  );
}
