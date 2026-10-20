import { describe, expect, it } from 'vitest';
import { EMPTY_DRAFT, formatPrice, priceDigits, validateStep1, validateStep2, type FormDraft } from './schema';

const good2: FormDraft = {
  ...EMPTY_DRAFT,
  title: 'Samsung double door fridge',
  description: 'Cools well. 2 years old. Comes with shelves.',
  condition_age: 'neatly_used',
  condition_work: 'working_perfectly',
  price: '150000',
};

describe('step 1', () => {
  it('needs a region and a category', () => {
    const r = validateStep1(EMPTY_DRAFT);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['category', 'region']);
  });
  it('accepts a valid pair', () => {
    expect(validateStep1({ ...EMPTY_DRAFT, region: 'ekiti', category: 'fridges' })).toEqual({ ok: true, data: { region: 'ekiti', category: 'fridges' } });
  });
  it('rejects a value that is not in the lists', () => {
    expect(validateStep1({ ...EMPTY_DRAFT, region: 'lagos', category: 'fridges' }).ok).toBe(false);
  });
});

describe('step 2 (PRD 6.3)', () => {
  it('accepts a complete form and turns empty optionals into null', () => {
    const r = validateStep2(good2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ price: 150000, brand: null, model: null, size: null });
  });
  it('keeps optional brand, model and size when given, trimmed', () => {
    const r = validateStep2({ ...good2, brand: ' Samsung ', model: 'RT38', size: '380 L' });
    expect(r.ok && r.data.brand).toBe('Samsung');
  });
  it('title: 3 to 80 characters', () => {
    expect(validateStep2({ ...good2, title: 'ab' }).ok).toBe(false);
    expect(validateStep2({ ...good2, title: 'abc' }).ok).toBe(true);
    expect(validateStep2({ ...good2, title: 'a'.repeat(80) }).ok).toBe(true);
    expect(validateStep2({ ...good2, title: 'a'.repeat(81) }).ok).toBe(false);
    expect(validateStep2({ ...good2, title: '    ' }).ok).toBe(false);
  });
  it('description: 10 to 1000 characters', () => {
    expect(validateStep2({ ...good2, description: 'too short' }).ok).toBe(false);
    expect(validateStep2({ ...good2, description: '1234567890' }).ok).toBe(true);
    expect(validateStep2({ ...good2, description: 'a'.repeat(1000) }).ok).toBe(true);
    expect(validateStep2({ ...good2, description: 'a'.repeat(1001) }).ok).toBe(false);
  });
  it('brand, model and size: at most 60 characters', () => {
    expect(validateStep2({ ...good2, brand: 'a'.repeat(60) }).ok).toBe(true);
    for (const f of ['brand', 'model', 'size'] as const) expect(validateStep2({ ...good2, [f]: 'a'.repeat(61) }).ok).toBe(false);
  });
  it('age and working status are required', () => {
    const r = validateStep2({ ...good2, condition_age: null, condition_work: null });
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['condition_age', 'condition_work']);
  });
  it('price: whole naira from 1 to 1,000,000,000', () => {
    expect(validateStep2({ ...good2, price: '' }).ok).toBe(false);
    expect(validateStep2({ ...good2, price: '0' }).ok).toBe(false);
    expect(validateStep2({ ...good2, price: '1' }).ok).toBe(true);
    expect(validateStep2({ ...good2, price: '1000000000' }).ok).toBe(true);
    expect(validateStep2({ ...good2, price: '1000000001' }).ok).toBe(false);
    expect(validateStep2({ ...good2, price: '12.5' }).ok).toBe(false);
  });
  it('reports only the first problem per field', () => {
    const r = validateStep2({ ...good2, title: '' });
    expect(!r.ok && r.errors.title).toBe('Add a title of at least 3 characters.');
  });
});

describe('price helpers', () => {
  it.each([['150000', '150,000'], ['1000000000', '1,000,000,000'], ['999', '999'], ['', ''], ['0150', '150'], ['12a3', '123']])('formatPrice(%j) = %j', (a, b) => {
    expect(formatPrice(a)).toBe(b);
  });
  it('priceDigits strips symbols and caps at 10 digits', () => {
    expect(priceDigits('₦ 150,000')).toBe('150000');
    expect(priceDigits('123456789012')).toBe('1234567890');
    expect(priceDigits('007')).toBe('7');
  });
});
