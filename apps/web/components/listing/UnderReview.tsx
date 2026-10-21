import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { primaryButton, secondaryButton } from './ui';

const NEXT = [
  ['bg-brand-red', 'Added', 'We have your item.'],
  ['bg-brand-blue', 'In review', 'An admin in your area checks it.'],
  ['bg-brand-green', 'Live', 'Buyers near you can see it.'],
] as const;

/** Shown after a successful submit (PRD FM-9). */
export function UnderReview({ onAnother }: { onAnother: () => void }) {
  return (
    <div className="flex flex-col gap-6 py-6" role="status">
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 size={52} className="text-tint-green" aria-hidden="true" />
        <h1 className="text-[28px] font-semibold leading-tight">Under review</h1>
        <p className="max-w-sm text-muted">
          Thank you. If something needs fixing, we will message you on WhatsApp.
        </p>
      </div>
      <ol className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-bg p-5">
        {NEXT.map(([color, title, text], i) => (
          <li key={title} className="flex items-center gap-4">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${color}`}>{i + 1}</span>
            <span className="flex flex-col"><span className="font-semibold">{title}</span><span className="text-sm text-muted">{text}</span></span>
          </li>
        ))}
      </ol>
      <button type="button" className={`${primaryButton} w-full`} onClick={onAnother}>
        List another item
      </button>
      <Link href="/" className={`${secondaryButton} flex items-center justify-center`}>Back to home</Link>
    </div>
  );
}
