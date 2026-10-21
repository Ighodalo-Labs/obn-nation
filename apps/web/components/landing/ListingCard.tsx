import Image from 'next/image';

type Props = { mode: 'auto' | 'stage'; stage?: 0 | 1 | 2; className?: string };

/** A pretend listing moving through the real OBN NATION flow: added, in review, live. Marked as an example. */
export function ListingCard({ mode, stage = 0, className = '' }: Props) {
  return (
    <figure className={className}>
      <div
        className="phone w-full max-w-[22rem] overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_40px_80px_-24px_rgba(0,0,0,.6)]"
        data-mode={mode}
        data-stage={stage}
      >
        <div className="relative aspect-[4/3]">
          <Image src="/photos/kitchen.webp" alt="" fill sizes="352px" className="object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-[#0A0A0A]/80 px-3 py-1 text-xs font-medium text-white backdrop-blur">Example listing</span>
        </div>
        <div className="p-4 text-[#0A0A0A]">
          <p className="text-lg font-semibold leading-tight">Washing machine, 7 kg</p>
          <p className="mt-0.5 text-sm text-[#5C5C58]">Port Harcourt, 6 photos and a video</p>
          <div className="relative mt-3 h-11">
            <div className="chip rounded-lg border-l-4 border-[#0A0A0A]/25 bg-[#F2F2F0] px-3 text-sm">
              <span><b className="font-semibold">Added.</b> <span className="text-[#5C5C58]">Sent for review</span></span>
            </div>
            <div className="chip rounded-lg border-l-4 border-brand-blue bg-[#F2F2F0] px-3 text-sm">
              <span><b className="font-semibold">In review.</b> <span className="text-[#5C5C58]">An admin is checking</span></span>
            </div>
            <div className="chip rounded-lg bg-brand-green px-3 text-sm text-white">
              <span aria-hidden="true" className="live flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-green">✓</span>
              <span><b className="font-semibold">Approved.</b> Live in Port Harcourt</span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
