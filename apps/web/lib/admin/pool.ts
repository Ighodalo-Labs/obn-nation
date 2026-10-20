import { CATEGORIES, AGES, REGIONS, WORKING } from '@/lib/listing/schema';
import { naira, type FeedRow } from './inbox';

export const POOL_PAGE_SIZE = 20;

export interface PoolFilters { category: string | null; region: string | null; search: string }

/** Keeps the search text safe for a pattern match: no wildcards or filter syntax characters (PL-4). */
export function cleanSearch(raw: string): string {
  return raw.replace(/[%_\\,()*"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

export function validFilters(f: Partial<PoolFilters>): PoolFilters {
  return {
    category: CATEGORIES.some((c) => c.value === f.category) ? (f.category as string) : null,
    region: REGIONS.some((r) => r.value === f.region) ? (f.region as string) : null,
    search: cleanSearch(f.search ?? ''),
  };
}

/** Row range for page n (0-based). */
export function pageRange(page: number): [number, number] {
  return [page * POOL_PAGE_SIZE, page * POOL_PAGE_SIZE + POOL_PAGE_SIZE - 1];
}

const label = (list: readonly { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;

/** PL-6: ready-to-paste ad text. It never includes seller details. */
export function adText(r: Pick<FeedRow, 'title' | 'price_ngn' | 'condition_age' | 'condition_work' | 'region' | 'category'>): string {
  return [
    r.title,
    `Price: ${naira(r.price_ngn)}`,
    `Condition: ${label(AGES, r.condition_age)}, ${label(WORKING, r.condition_work).toLowerCase()}`,
    `Category: ${label(CATEGORIES, r.category)}`,
    `Location: ${label(REGIONS, r.region)}`,
    'OBN NATION: Connecting People',
  ].join('\n');
}
