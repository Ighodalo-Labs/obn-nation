'use client';

import { useEffect, useRef, useState } from 'react';
import { REASON_CHIPS, validateReason } from '@/lib/admin/reasons';
import { inputClass, primaryButton, secondaryButton } from '../listing/ui';

/** PRD AD-5: a required reason of 5 to 500 characters, with quick-pick chips. */
export function RejectModal({ title, busy, onCancel, onSubmit }: {
  title: string; busy: boolean; onCancel: () => void; onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  function send() {
    const r = validateReason(reason);
    if (!r.ok) return setError(r.message);
    setError(null);
    onSubmit(r.reason);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Reject listing" className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center">
      <div className="flex w-full max-w-xl flex-col gap-3 rounded-t-2xl border border-border bg-bg p-4 sm:rounded-2xl">
        <h2 className="text-xl">Reject “{title}”</h2>
        <p className="text-sm text-muted">The seller gets this reason on WhatsApp, with a link to fix the listing.</p>
        <div className="flex flex-wrap gap-2">
          {REASON_CHIPS.map((c) => (
            <button key={c} type="button" className="min-h-12 rounded-full border border-border px-3 text-sm" onClick={() => { setReason(c); setError(null); box.current?.focus(); }}>
              {c}
            </button>
          ))}
        </div>
        <label htmlFor="reason" className="text-base">Reason <span className="text-sm text-muted">{reason.trim().length} / 500</span></label>
        <textarea id="reason" ref={box} className={`${inputClass} min-h-28`} rows={4} maxLength={500} value={reason}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'reason-error' : undefined}
          onChange={(e) => { setReason(e.target.value); setError(null); }} />
        {error && <p id="reason-error" role="alert" className="text-sm text-tint-red">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={secondaryButton} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={primaryButton} onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Reject and message seller'}</button>
        </div>
      </div>
    </div>
  );
}
