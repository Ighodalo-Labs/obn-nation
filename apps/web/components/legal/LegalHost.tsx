'use client';

import { useEffect, useRef, useState } from 'react';
import { LEGAL, type LegalKind } from './legal-content';

export const OPEN_LEGAL = 'obn:legal';

/** Opens the Terms or Privacy pop-up from anywhere on the page, without leaving it. */
export function openLegal(kind: LegalKind) {
  window.dispatchEvent(new CustomEvent<LegalKind>(OPEN_LEGAL, { detail: kind }));
}

/** Put this once on a page. It listens for openLegal() and for #terms / #privacy in the address. */
export function LegalHost() {
  const [kind, setKind] = useState<LegalKind | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const open = (e: Event) => {
      opener.current = document.activeElement;
      setKind((e as CustomEvent<LegalKind>).detail);
    };
    const fromHash = () => {
      if (window.location.hash === '#terms') setKind('terms');
      else if (window.location.hash === '#privacy') setKind('privacy');
    };
    fromHash();
    window.addEventListener(OPEN_LEGAL, open);
    window.addEventListener('hashchange', fromHash);
    return () => {
      window.removeEventListener(OPEN_LEGAL, open);
      window.removeEventListener('hashchange', fromHash);
    };
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (kind && !d.open) {
      d.showModal();
      document.body.style.overflow = 'hidden';
    }
    if (!kind && d.open) d.close();
  }, [kind]);

  function close() {
    document.body.style.overflow = '';
    setKind(null);
    if (window.location.hash === '#terms' || window.location.hash === '#privacy') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    if (opener.current instanceof HTMLElement) opener.current.focus();
  }

  const doc = kind ? LEGAL[kind] : null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby="legal-title"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === dialog.current) close(); }}
      className="m-auto w-[min(42rem,calc(100vw-1.5rem))] max-h-[85vh] overflow-hidden rounded-3xl border-0 bg-white p-0 text-[#16140F] shadow-2xl backdrop:bg-black/60"
    >
      {doc && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex h-1.5 shrink-0" aria-hidden="true"><span className="flex-1 bg-brand-red" /><span className="flex-1 bg-brand-green" /><span className="flex-1 bg-brand-blue" /></div>
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              <h2 id="legal-title" className="font-display text-2xl font-bold">{doc.title}</h2>
              <p className="mt-1 text-sm text-[#6B655A]">Last updated: {doc.updated}</p>
            </div>
            <button type="button" onClick={close} autoFocus className="flex min-h-12 shrink-0 items-center rounded-full border-2 border-[#16140F]/15 px-5 text-sm font-bold transition-colors hover:bg-[#16140F] hover:text-white">Close</button>
          </div>
          <div className="overflow-y-auto px-6 pb-6 pt-4">
            {doc.sections.map((s) => (
              <section key={s.heading} className="mb-5">
                <h3 className="font-display text-lg font-bold">{s.heading}</h3>
                {s.paragraphs.map((p) => <p key={p} className="mt-1.5 text-[15px] leading-relaxed text-[#3B372F]">{p}</p>)}
              </section>
            ))}
          </div>
        </div>
      )}
    </dialog>
  );
}
