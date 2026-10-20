import { describe, expect, it } from 'vitest';
import { nameSchema } from './name';

describe('nameSchema (SI-7)', () => {
  it('trims and collapses spaces', () => {
    expect(nameSchema.parse({ full_name: '  Ada   Obi ' }).full_name).toBe('Ada Obi');
  });
  it('accepts 2 and 80 characters', () => {
    expect(nameSchema.safeParse({ full_name: 'Al' }).success).toBe(true);
    expect(nameSchema.safeParse({ full_name: 'a'.repeat(80) }).success).toBe(true);
  });
  it('rejects 1 character, 81 characters and blanks', () => {
    expect(nameSchema.safeParse({ full_name: 'A' }).success).toBe(false);
    expect(nameSchema.safeParse({ full_name: 'a'.repeat(81) }).success).toBe(false);
    expect(nameSchema.safeParse({ full_name: '    ' }).success).toBe(false);
  });
  it('removes line breaks', () => {
    expect(nameSchema.parse({ full_name: 'Ada\nObi' }).full_name).toBe('Ada Obi');
  });
});
