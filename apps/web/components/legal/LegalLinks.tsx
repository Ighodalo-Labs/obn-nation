'use client';

import { openLegal } from './LegalHost';
import type { LegalKind } from './legal-content';

const cls = 'flex min-h-12 items-center rounded-full px-4 text-sm transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

export function LegalLinks() {
  const item = (kind: LegalKind, label: string) => (
    <button type="button" className={cls} onClick={() => openLegal(kind)}>{label}</button>
  );
  return <div className="flex flex-wrap">{item('terms', 'Terms & Conditions')}{item('privacy', 'Privacy Policy')}</div>;
}

/** Inline text link for sentences, like the newsletter consent line. */
export function LegalInline({ kind, children }: { kind: LegalKind; children: string }) {
  return (
    <button type="button" onClick={() => openLegal(kind)} className="font-semibold underline underline-offset-2 hover:no-underline">{children}</button>
  );
}
