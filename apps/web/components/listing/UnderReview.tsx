import { CheckCircle2 } from 'lucide-react';
import { primaryButton } from './ui';

/** Shown after a successful submit (PRD FM-9). */
export function UnderReview({ onAnother }: { onAnother: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center" role="status">
      <CheckCircle2 size={48} className="text-tint-green" aria-hidden="true" />
      <h1 className="text-2xl">Under review</h1>
      <p className="max-w-sm text-muted">
        Thank you. An admin in your area will check your listing. If something needs fixing, we will message you on WhatsApp.
      </p>
      <button type="button" className={`${primaryButton} w-full`} onClick={onAnother}>
        List another item
      </button>
    </div>
  );
}
