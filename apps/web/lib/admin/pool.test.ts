import { describe, expect, it } from 'vitest';
import { adText, cleanSearch, pageRange, POOL_PAGE_SIZE, validFilters } from './pool';

describe('pool helpers', () => {
  it('cleanSearch removes wildcard and filter characters', () => {
    expect(cleanSearch("  sam%sung_(fridge),'x' ")).toBe('sam sung fridge x');
    expect(cleanSearch('a'.repeat(100))).toHaveLength(60);
  });
  it('validFilters drops unknown values', () => {
    expect(validFilters({ category: 'fridges', region: 'mars', search: ' tv ' })).toEqual({ category: 'fridges', region: null, search: 'tv' });
    expect(validFilters({ category: 'x' })).toEqual({ category: null, region: null, search: '' });
  });
  it('pageRange gives 20 rows a page', () => {
    expect(pageRange(0)).toEqual([0, POOL_PAGE_SIZE - 1]);
    expect(pageRange(2)).toEqual([40, 59]);
  });
  it('adText has no seller details', () => {
    const t = adText({ title: 'Samsung fridge', price_ngn: '150000.00', condition_age: 'neatly_used', condition_work: 'working_perfectly', region: 'delta', category: 'fridges' });
    expect(t).toContain('Samsung fridge');
    expect(t).toContain('₦150,000');
    expect(t).toContain('Delta');
    expect(t).not.toMatch(/\+234|phone|seller/i);
  });
});
