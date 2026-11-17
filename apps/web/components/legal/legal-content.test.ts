import { describe, expect, it } from 'vitest';
import { LEGAL } from './legal-content';

describe('legal content', () => {
  for (const kind of ['terms', 'privacy'] as const) {
    it(`${kind} has a title, a date and enough sections`, () => {
      const d = LEGAL[kind];
      expect(d.title.length).toBeGreaterThan(3);
      expect(d.updated).toMatch(/\d{4}/);
      expect(d.sections.length).toBeGreaterThanOrEqual(5);
      for (const s of d.sections) {
        expect(s.heading).not.toBe('');
        expect(s.paragraphs.length).toBeGreaterThan(0);
        for (const p of s.paragraphs) expect(p.trim()).not.toBe('');
      }
    });
  }
});
