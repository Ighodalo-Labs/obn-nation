import type { FieldErrors, FormDraft } from '@/lib/listing/schema';
import { formatPrice, priceDigits } from '@/lib/listing/schema';
import { ageOptions, workOptions } from './options';
import { CardChoice, Field, inputClass } from './ui';

/** Step 2 fields (PRD 6.3). Shared by the new-listing form and the edit page. */
export function DetailsFields({ draft, errors, set }: {
  draft: FormDraft;
  errors: FieldErrors;
  set: <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => void;
}) {
  return (
    <>
      <Field id="title" label="Title" error={errors.title}>
        <input id="title" className={inputClass} type="text" maxLength={80} value={draft.title} placeholder="Samsung double door fridge"
          aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined}
          onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field id="description" label="Description" hint={`${draft.description.length} / 1000`} error={errors.description}>
        <textarea id="description" className={`${inputClass} min-h-28`} rows={4} maxLength={1000} value={draft.description}
          placeholder="What it is, how old it is, what comes with it."
          aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-error' : undefined}
          onChange={(e) => set('description', e.target.value)} />
      </Field>
      <Field id="brand" label="Brand" hint="optional" error={errors.brand}>
        <input id="brand" className={inputClass} type="text" maxLength={60} value={draft.brand} onChange={(e) => set('brand', e.target.value)} />
      </Field>
      <Field id="model" label="Model" hint="optional" error={errors.model}>
        <input id="model" className={inputClass} type="text" maxLength={60} value={draft.model} onChange={(e) => set('model', e.target.value)} />
      </Field>
      <Field id="size" label="Size" hint="optional, like 43 inch or 2.5 kVA" error={errors.size}>
        <input id="size" className={inputClass} type="text" maxLength={60} value={draft.size} onChange={(e) => set('size', e.target.value)} />
      </Field>
      <CardChoice name="age" legend="Age of item" options={ageOptions} value={draft.condition_age}
        onChange={(v) => set('condition_age', v)} error={errors.condition_age} columns={1} />
      <CardChoice name="work" legend="Working status" options={workOptions} value={draft.condition_work}
        onChange={(v) => set('condition_work', v)} error={errors.condition_work} columns={3} />
      <Field id="price" label="Price" error={errors.price}>
        <div className="flex gap-2">
          <span className="flex min-h-12 items-center rounded-xl border border-border bg-bg px-3 text-base text-muted">₦</span>
          <input id="price" className={inputClass} type="text" inputMode="numeric" autoComplete="off" placeholder="150,000"
            value={formatPrice(draft.price)} aria-invalid={Boolean(errors.price)} aria-describedby={errors.price ? 'price-error' : undefined}
            onChange={(e) => set('price', priceDigits(e.target.value))} />
        </div>
      </Field>
    </>
  );
}
