import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BRAND_TAGLINE } from './brand';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
}

describe('brand tagline', () => {
  it('is the exact corporate text', () => {
    expect(BRAND_TAGLINE).toBe('OBN NATION — Connecting People');
  });
  it('the old footer text is gone from the app', () => {
    const root = join(__dirname, '..');
    const hits = [...files(join(root, 'app')), ...files(join(root, 'components'))].filter((f) =>
      readFileSync(f, 'utf8').includes('Online. Connecting People'),
    );
    expect(hits).toEqual([]);
  });
});
