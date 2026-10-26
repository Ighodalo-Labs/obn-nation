import Link from 'next/link';
import { CHANNEL_NAME } from '@/lib/channel';
import { primaryButton, secondaryButton } from './ui';

const NEXT = [
  ['bg-brand-red', 'Added', 'We have your item.'],
  ['bg-brand-blue', 'In review', 'An admin in your area checks it.'],
  ['bg-brand-green', 'Live', 'Buyers near you can see it.'],
] as const;

/** Shown after a successful submit (PRD FM-9). */
export function UnderReview({ onAnother }: { onAnother: () => void }) {
  return (
    <div className="flex flex-col gap-8" role="status">
      <div className="flex flex-col gap-4">
        <span className="flex h-1.5 w-20 overflow-hidden rounded-full" aria-hidden="true"><i className="flex-1 bg-brand-red" /><i className="flex-1 bg-brand-green" /><i className="flex-1 bg-brand-blue" /></span>
        <h1 className="font-display text-[clamp(2.4rem,7vw,3.6rem)] font-bold leading-[1] tracking-[-0.01em]">Under review.<br />Nice one.</h1>
        <p className="max-w-sm text-lg text-[#6B655A]">
          Thank you. If something needs fixing, we will message you on {CHANNEL_NAME}.
        </p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3">
        {NEXT.map(([color, title, text], i) => (
          <li key={title} className={`${color} flex min-h-[120px] flex-col justify-between rounded-2xl p-4 text-white`}>
            <span className="font-display text-3xl font-bold text-white/50">{`0${i + 1}`}</span>
            <span className="flex flex-col"><b className="text-lg">{title}</b><span className="text-sm text-white/85">{text}</span></span>
          </li>
        ))}
      </ol>
      <div className="grid gap-3">
        <button type="button" className={`${primaryButton} w-full`} onClick={onAnother}>
          List another item
        </button>
        <Link href="/" className={`${secondaryButton} flex items-center justify-center`}>Back to home</Link>
      </div>
    </div>
  );
}
