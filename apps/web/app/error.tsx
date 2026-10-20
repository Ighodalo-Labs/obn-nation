'use client';

import { primaryButton } from '@/components/listing/ui';

/** Shown when a page fails unexpectedly. No technical detail reaches the person. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <div className="flex flex-col items-start gap-4 py-12">
        <h1 className="text-2xl">Something went wrong</h1>
        <p role="alert" className="text-base text-muted">This was a problem on our side. Please try again.</p>
        <button type="button" className={primaryButton} onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
