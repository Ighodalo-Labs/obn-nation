import Link from 'next/link';
import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import { EditForm } from '@/components/listing/EditForm';
import { ApiError } from '@/lib/api/errors';
import { buildEditDeps, signMedia } from '@/lib/edit/deps';
import { loadForEdit } from '@/lib/edit/core';

export const dynamic = 'force-dynamic';
// ED-10: never index this page. The no-referrer header is set in the middleware.
export const metadata: Metadata = { title: 'Fix your listing · OBN NATION', robots: { index: false, follow: false }, referrer: 'no-referrer' };

function Problem({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <h1 className="text-2xl">We cannot open this link</h1>
      <p role="alert" className="text-base">{message}</p>
      <Link href="/" className="flex min-h-12 items-center text-tint-blue underline">Go to the home page</Link>
    </div>
  );
}

/** Opening the link does not use it up (ED-2). Only a successful resubmit does. */
export default async function EditPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  try {
    const deps = buildEditDeps();
    const listing = await loadForEdit(deps, token);
    const signed = await signMedia({ photos: listing.photo_urls, video: listing.video_url });
    return (
      <main>
        <Header />
        <EditForm token={token} listing={listing} signed={signed} />
      </main>
    );
  } catch (e) {
    const message = e instanceof ApiError && e.code !== 'internal_error' ? e.message : 'Something went wrong on our side. Please try again.';
    return (
      <main>
        <Header />
        <Problem message={e instanceof ApiError && e.code === 'invalid_state' ? 'This listing is not waiting for changes any more.' : message} />
      </main>
    );
  }
}
