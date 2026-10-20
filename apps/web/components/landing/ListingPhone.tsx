import { Fridge } from './Art';

type Props = { mode: 'auto' | 'stage'; stage?: 0 | 1 | 2; className?: string };

/** A pretend listing moving through the real OBN NATION flow: added, in review, live. Shown as an example only. */
export function ListingPhone({ mode, stage = 0, className = '' }: Props) {
  return (
    <figure className={className}>
      <div
        className="phone relative mx-auto aspect-[9/18] w-[240px] rounded-[2.4rem] border border-white/15 bg-[#101010] p-2.5 shadow-[0_40px_80px_-20px_rgba(0,0,0,.9),0_0_0_1px_rgba(255,255,255,.04)_inset] sm:w-[270px]"
        data-mode={mode}
        data-stage={stage}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[1.9rem] bg-surface">
          <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-white/10" />
          <div className="m-3 mb-0 flex flex-1 items-center justify-center rounded-2xl bg-gradient-to-br from-[#16324f] to-[#0e1b2b]">
            <Fridge className="h-32 w-32" />
          </div>
          <div className="p-4">
            <p className="text-base font-semibold leading-tight">Double-door fridge</p>
            <p className="mt-0.5 text-sm text-muted">Ibadan · 6 photos and a video</p>
            <div className="relative mt-3 h-11">
              <div className="chip rounded-lg bg-white/5 px-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-tint-blue" />
                <span><b className="font-semibold">Added.</b> <span className="text-muted">Sent for review</span></span>
              </div>
              <div className="chip rounded-lg bg-white/5 px-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFB74D]" />
                <span><b className="font-semibold">In review.</b> <span className="text-muted">An admin is checking</span></span>
              </div>
              <div className="chip rounded-lg bg-brand-green px-3 text-sm text-white">
                <span aria-hidden="true" className="live flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-green">✓</span>
                <span><b className="font-semibold">Approved.</b> Live in Ibadan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-sm text-muted">Example listing</figcaption>
    </figure>
  );
}
