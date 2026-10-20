import { EMPTY_DRAFT, type FormDraft } from './schema';

/** What survives a refresh (PRD FM-2, FM-8). Photos and video are never stored here. */
export interface SavedForm {
  draft: FormDraft;
  step: 1 | 2 | 3;
  clientKey: string;
}

const KEY = 'obn_listing_form_v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function newClientKey(): string {
  return crypto.randomUUID();
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function sessionStore(): Store | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function text(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function textOrNull(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

/** Reads saved answers. Anything odd (old format, tampering, no storage) falls back to a fresh form. */
export function loadForm(store: Store | null = sessionStore()): SavedForm {
  const fresh: SavedForm = { draft: { ...EMPTY_DRAFT }, step: 1, clientKey: newClientKey() };
  try {
    const raw = store?.getItem(KEY);
    if (!raw) return fresh;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const d = (o.draft ?? {}) as Record<string, unknown>;
    const step = o.step === 2 || o.step === 3 ? o.step : 1;
    return {
      draft: {
        region: textOrNull(d.region),
        category: textOrNull(d.category),
        title: text(d.title),
        description: text(d.description),
        brand: text(d.brand),
        model: text(d.model),
        size: text(d.size),
        condition_age: textOrNull(d.condition_age),
        condition_work: textOrNull(d.condition_work),
        price: text(d.price).replace(/\D/g, '').slice(0, 10),
      },
      step,
      clientKey: typeof o.clientKey === 'string' && UUID.test(o.clientKey) ? o.clientKey : fresh.clientKey,
    };
  } catch {
    return fresh;
  }
}

export function saveForm(form: SavedForm, store: Store | null = sessionStore()): void {
  try {
    store?.setItem(KEY, JSON.stringify(form));
  } catch {
    // Storage full or blocked. The form still works; it just will not survive a refresh.
  }
}

/** Called after a successful submit so "List another item" starts clean with a new client_key. */
export function clearForm(store: Store | null = sessionStore()): void {
  try {
    store?.removeItem(KEY);
  } catch {
    // ignore
  }
}
