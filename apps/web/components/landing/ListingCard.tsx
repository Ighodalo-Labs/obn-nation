import Image from 'next/image';

type Props = { mode: 'auto' | 'stage'; stage?: 0 | 1 | 2; className?: string };

/** A pretend listing moving through the real OBN NATION flow: added, in review, live. Shown as an example only. */
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
        </div>
        <div className="p-4 text-[#141414]">
          <p className="text-lg font-semibold leading-tight">Washing machine, 7 kg</p>
          <p className="mt-0.5 text-sm text-[#6B6A66]">Ibadan · 6 photos and a video</p>
          <div className="relative mt-3 h-11">
            <div className="chip rounded-lg bg-[#F1F0EC] px-3 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" aria-hidden="true" />
              <span><b className="font-semibold">Added.</b> <span className="text-[#6B6A66]">Sent for review</span></span>
            </div>
            <div className="chip rounded-lg bg-[#F1F0EC] px-3 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E59A1A]" aria-hidden="true" />
              <span><b className="font-semibold">In review.</b> <span className="text-[#6B6A66]">An admin is checking</span></span>
            </div>
            <div className="chip rounded-lg bg-brand-green px-3 text-sm text-white">
              <span aria-hidden="true" className="live flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-green">✓</span>
              <span><b className="font-semibold">Approved.</b> Live in Ibadan</span>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-[#6B6A66]">Example listing</figcaption>
    </figure>
  );
}
