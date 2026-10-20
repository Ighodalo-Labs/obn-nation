import { z } from 'zod';

/** Values match the database enums (migration 0001). Labels are what sellers read. */
export const REGIONS = [
  { value: 'port_harcourt', label: 'Port Harcourt' },
  { value: 'delta', label: 'Delta' },
  { value: 'ekiti', label: 'Ekiti' },
] as const;

export const CATEGORIES = [
  { value: 'phones', label: 'Phones' },
  { value: 'computers', label: 'Computers' },
  { value: 'tvs', label: 'TVs' },
  { value: 'fridges', label: 'Fridges' },
  { value: 'generators', label: 'Generators' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'other', label: 'Other' },
] as const;

export const AGES = [
  { value: 'new_sealed', label: 'New, sealed' },
  { value: 'new_open_box', label: 'New, open box' },
  { value: 'premium_used', label: 'Premium used' },
  { value: 'neatly_used', label: 'Neatly used' },
  { value: 'fairly_used', label: 'Fairly used' },
] as const;

export const WORKING = [
  { value: 'working_perfectly', label: 'Working perfectly' },
  { value: 'minor_issues', label: 'Minor issues' },
  { value: 'not_working', label: 'Not working' },
] as const;

const values = <T extends readonly { value: string }[]>(list: T) => list.map((x) => x.value) as [T[number]['value'], ...T[number]['value'][]];

export const PRICE_MIN = 1;
export const PRICE_MAX = 1_000_000_000;

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();
const optionalText = z
  .string()
  .transform(oneLine)
  .pipe(z.string().max(60, 'Please keep it under 60 characters.'))
  .transform((s) => (s === '' ? null : s));

/** Step 1 (PRD 6.3). */
export const step1Schema = z.object({
  region: z.enum(values(REGIONS), { errorMap: () => ({ message: 'Choose where you are.' }) }),
  category: z.enum(values(CATEGORIES), { errorMap: () => ({ message: 'Choose a category.' }) }),
});

/** Step 2 (PRD 6.3). `price` is the digits the seller typed. */
export const step2Schema = z.object({
  title: z
    .string()
    .transform(oneLine)
    .pipe(z.string().min(3, 'Add a title of at least 3 characters.').max(80, 'Please keep the title under 80 characters.')),
  description: z
    .string()
    .transform((s) => s.replace(/\r\n/g, '\n').trim())
    .pipe(z.string().min(10, 'Add at least 10 characters.').max(1000, 'Please keep it under 1000 characters.')),
  brand: optionalText,
  model: optionalText,
  size: optionalText,
  condition_age: z.enum(values(AGES), { errorMap: () => ({ message: 'Choose the age of the item.' }) }),
  condition_work: z.enum(values(WORKING), { errorMap: () => ({ message: 'Choose the working status.' }) }),
  price: z
    .string()
    .regex(/^\d+$/, 'Enter the price in naira, digits only.')
    .transform(Number)
    .pipe(
      z
        .number()
        .min(PRICE_MIN, 'The price must be at least ₦1.')
        .max(PRICE_MAX, 'The price cannot be more than ₦1,000,000,000.'),
    ),
});

export type Step1 = z.infer<typeof step1Schema>;
export type Step2 = z.infer<typeof step2Schema>;

/** What the form holds while the seller types. Everything is a string or null so half-filled forms are fine. */
export interface FormDraft {
  region: string | null;
  category: string | null;
  title: string;
  description: string;
  brand: string;
  model: string;
  size: string;
  condition_age: string | null;
  condition_work: string | null;
  price: string;
}

export const EMPTY_DRAFT: FormDraft = {
  region: null,
  category: null,
  title: '',
  description: '',
  brand: '',
  model: '',
  size: '',
  condition_age: null,
  condition_work: null,
  price: '',
};

export type FieldErrors = Record<string, string>;

function toErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export function validateStep1(d: FormDraft): { ok: true; data: Step1 } | { ok: false; errors: FieldErrors } {
  const r = step1Schema.safeParse({ region: d.region ?? '', category: d.category ?? '' });
  return r.success ? { ok: true, data: r.data } : { ok: false, errors: toErrors(r.error) };
}

export function validateStep2(d: FormDraft): { ok: true; data: Step2 } | { ok: false; errors: FieldErrors } {
  const r = step2Schema.safeParse({
    title: d.title,
    description: d.description,
    brand: d.brand,
    model: d.model,
    size: d.size,
    condition_age: d.condition_age ?? '',
    condition_work: d.condition_work ?? '',
    price: d.price,
  });
  return r.success ? { ok: true, data: r.data } : { ok: false, errors: toErrors(r.error) };
}

/** "150000" -> "150,000". Non-digits are dropped. */
export function formatPrice(digits: string): string {
  const clean = digits.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Keeps digits only, at most 10 characters (₦1,000,000,000 is 10 digits). */
export function priceDigits(input: string): string {
  return input.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 10);
}
