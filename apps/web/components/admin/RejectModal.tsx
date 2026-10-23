'use client';

import { useRef, useState } from 'react';
import { REASON_CHIPS, validateReason } from '@/lib/admin/reasons';
import { Dialog } from './ui';

/** PRD AD-5: a required reason of 5 to 500 characters, with quick-pick chips. */
export function RejectModal({ title, busy, onCancel, onSubmit }: {
  title: string; busy: boolean; onCancel: () => void; onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  function send() {
    const r = validateReason(reason);
    if (!r.ok) return setError(r.message);
    setError(null);
    onSubmit(r.reason);
  }

  return (
    <Dialog title={`Reject “${title}”`} onClose={onCancel} busy={busy} z={80}>
      <p className="ops-mute text-[13px]">The seller gets this reason on WhatsApp, with a link to fix the listing.</p>
      <div className="flex flex-wrap gap-2">
        {REASON_CHIPS.map((c) => (
          <button key={c} type="button" className="ops-btn ops-btn-sm" onClick={() => { setReason(c); setError(null); box.current?.focus(); }}>
            {c}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="reason" className="ops-label flex items-baseline justify-between">Reason <span className="ops-mute text-xs font-normal ops-tnum">{reason.trim().length} / 500</span></label>
        <textarea id="reason" ref={box} className="ops-input min-h-24" rows={4} maxLength={500} value={reason}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'reason-error' : undefined}
          onChange={(e) => { setReason(e.target.value); setError(null); }} />
        {error && <p id="reason-error" role="alert" className="text-[13px] text-[var(--p-crit-text)]">{error}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="ops-btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="ops-btn ops-btn-red" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Reject and message seller'}</button>
      </div>
    </Dialog>
  );
}
