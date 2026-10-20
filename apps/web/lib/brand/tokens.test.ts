import { describe, expect, it } from 'vitest';
import { contrast, tokens } from './tokens';

describe('brand tokens (PRD 2.2)', () => {
  it('white text on every brand fill is at least 4.5:1', () => {
    for (const fill of [tokens.red, tokens.green, tokens.blue]) {
      expect(contrast(tokens.text, fill)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('tints used as text on the dark background are at least 4.5:1', () => {
    for (const tint of [tokens.redTint, tokens.greenTint, tokens.blueTint, tokens.textMuted, tokens.text]) {
      expect(contrast(tint, tokens.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('plain brand fills are NOT used as text on the dark background (below 4.5:1)', () => {
    for (const fill of [tokens.red, tokens.green, tokens.blue]) {
      expect(contrast(fill, tokens.bg)).toBeLessThan(4.5);
    }
  });
});
