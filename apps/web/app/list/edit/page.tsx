import Link from 'next/link';
import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
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
      <h1 className="font-display text-[clamp(1.9rem,5vw,2.6rem)] font-bold leading-[1.05] tracking-[-0.01em]">We cannot open this link</h1>
      <p role="alert" className="text-lg text-[#6B655A]">{message}</p>
      <Link href="/" className="inline-flex min-h-14 items-center justify-center rounded-full bg-brand-red px-7 text-base font-bold text-white transition-all hover:bg-[#16140F] active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16140F]">Go to the home page</Link>
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
      <AppShell>
        <EditForm token={token} listing={listing} signed={signed} />
      </AppShell>
    );
  } catch (e) {
    const message = e instanceof ApiError && e.code !== 'internal_error' ? e.message : 'Something went wrong on our side. Please try again.';
    return (
      <AppShell>
        <Problem message={e instanceof ApiError && e.code === 'invalid_state' ? 'This listing is not waiting for changes any more.' : message} />
      </AppShell>
    );
  }
}
